# POS (Point of Sale)

TurboHesap'ın satış-noktası modülü: şablondan bağımsız, restoran-uyumlu bir
satış ekranı, ürün **modifier/seçenekleri**, **bölme & çoklu tahsilat**, **PIN**
ile hızlı kasiyer girişi, ve ileride bir **masaüstü** istemci yazılabilmesi için
tamamen HTTP/JSON üzerinden çalışan bir API. Bu belge API'yi, veri modelini ve
satışın stok/kasa/cari'ye nasıl işlendiğini anlatır.

İlgili belgeler: [`auth.md`](./auth.md) (JWT + RBAC), [`modules.md`](./modules.md)
(`/api/<module>/<resource>` yakınsaması), `../AGENTS.md` (mimari).

---

## Tasarım kararları

1. **Doğrudan muhasebeleştirme.** Bir POS siparişi tam ödendiğinde (`settle`)
   sunucu **tek bir veritabanı transaction'ında** şunları yazar: stok çıkışı +
   kasa/banka tahsilatı + (hesaba satışta) cari borçlandırma. Bu, `invoices`
   modülünün ödeme/iptal desenini **birebir** kopyalar. Fatura **opsiyoneldir**
   ve üretildiğinde **taslak** (stok düşmez) olur → **çift stok düşüşü olmaz**.
2. **KDV dahil (varsayılan).** Türkiye raf fiyatları KDV içerir. Matrah
   ayrıştırma tek bir yerde (`pos-pricing.helpers.ts → taxBreakdown`) yapılır;
   kasa başına `settings.taxInclusive` ile değiştirilebilir ve siparişe snapshot
   alınır (geçmiş fiş değişmez).
3. **Fiyat sunucuda çözülür.** İstemci yalnızca `productId` + `qty`
   (+ `modifiers:[{optionId}]`) gönderir; **ad, birim fiyat, KDV oranı ve
   modifier snapshot'ları sunucu tarafında** üründen / kasanın satış kanalı
   fiyatından (`ProductChannelPrice`) / katalog opsiyonundan çözülür. İstemcinin
   gönderdiği fiyat yalnızca **override**'dır (fiyat-override yetkisi gerektirir),
   böylece cihazdan fiyat oynanamaz.
4. **PIN + hızlı kasiyer değiştir.** Kullanıcı POS kullanıcısı işaretlenir ve bir
   PIN alır. Terminal `pos-login` ile (kullanıcı adı + PIN) açılır; vardiya
   ortasında `pos-switch` (yalnız PIN) ile kasiyer değişir.
5. **Offline-güvenli.** Sipariş ve ödeme oluşturma `clientRef` (uuid, **unique**)
   ile idempotenttir — aynı `clientRef` tekrar gönderilirse mevcut kayıt döner.

---

## Veri modeli (ERD özeti)

```
inventory_modifier_groups   ──<  inventory_modifier_options        (priceDelta ±)
        │  (M:N)
inventory_product_modifier_links  >── products

pos_registers (branch, salesChannel?, settings jsonb)
   └─< pos_sessions (vardiya: openingCash / countedCash / status)
          └─< pos_orders (clientRef unique, status, totals, taxInclusive, parentOrderId?)
                 ├─< pos_order_lines (name/qty/unitPrice/discount/taxRate snapshot, kitchenStatus)
                 │       └─< pos_order_line_modifiers (group/option name + priceDelta snapshot)
                 └─< pos_payments (method, amount, change, finance/contact tx back-links, clientRef)
```

- **Para/miktar** alanları `numeric` + `decimalTransformer` (double precision yok).
- Her işlem varlığında `branchId` taşınır (kasanın şubesinden türetilir).
- `pos_order_line_modifiers` ve `pos_order_lines` **snapshot** tutar: katalog
  sonradan değişse de geçmiş fiş aynı kalır.
- **Satılamaz ürün reddi:** POS her zaman satış olduğundan, `writeLines` bir
  satırın ürünü `canBeSold=false` ise 400 döner (client `pos-sell` listesi
  zaten `canBeSold` ile filtreler; bu server-side güvence). Aynı bayrak
  faturalarda/siparişlerde de zorlanır — bkz. AGENTS.md ürün rol/bayrak notu.

### Sipariş durumları

`open` → `paid` → (`refunded`) ; ayrıca `voided` (ödenmemiş iptal), `parked`
(beklemede). Yalnız `open`/`parked` düzenlenebilir; `paid`/`refunded` silinemez.

---

## Kimlik doğrulama (PIN)

Standart `username/password` akışına ek olarak (bkz. [`auth.md`](./auth.md)):

| Endpoint | Erişim | Gövde | Döner |
|---|---|---|---|
| `POST /api/auth/pos-login` | **@Public**, throttled (10/dk) | `{username, pin}` | `{accessToken, refreshToken, user}` |
| `POST /api/auth/pos-switch` | Bearer (cihaz oturumu), throttled (20/dk) | `{pin}` | `{accessToken, refreshToken, user}` |
| `POST /api/auth/pos-pin` | Bearer (kendi) | `{pin, currentPassword?}` | `204` |
| `POST /api/iam/users/:id/pin` | `pos.users.pin` | `{pin\|null}` | güncel `UserDto` |

- `User` varlığı `isPosUser` (boolean) ve `posPinHash` (**`select:false`**,
  bcrypt) alanlarına sahiptir. PIN asla serileştirilmez; `UserDto` yalnızca
  `hasPosPin: boolean` döner.
- `pos-login` yalnızca `isActive && isPosUser && posPinHash` olan kullanıcıyı
  kabul eder; yanlış PIN → **401**.
- `pos-switch` aynı cihaz oturumunda PIN'i olan POS kullanıcıları arasında eşleşme
  arar (kullanıcı adı gerekmez) — hızlı kasiyer değişimi.

---

## Modifier'lar (ürün seçenekleri) — `inventory`

Yeniden kullanılabilir gruplar (ör. "Ekstra Soslar") çok ürüne bağlanır.

| Endpoint | Yetki | Açıklama |
|---|---|---|
| `GET/POST /api/inventory/modifier-groups` | `inventory.modifiers.read/write` | grup listele / oluştur |
| `GET/PATCH/DELETE /api/inventory/modifier-groups/:id` | … | grup oku / güncelle / sil |
| `POST /api/inventory/modifier-groups/:id/options` | `inventory.modifiers.write` | opsiyon ekle (`priceDelta` ±) |
| `PATCH/DELETE …/options/:optionId` | … | opsiyon güncelle / sil |
| `GET /api/inventory/products/:id/modifiers` | `inventory.modifiers.read` | ürünün grupları |
| `PUT /api/inventory/products/:id/modifiers` | `inventory.modifiers.write` | `{groupIds:[…]}` ile bağla |

Grup alanları: `selectionType: 'single' | 'multi'`, `required`, `minSelect`,
`maxSelect`. Opsiyon: `name`, `priceDelta` (negatif olabilir — "soğan çıkar −₺"),
`isDefault`.

`GET /api/inventory/products/modifier-map` → `{ productId: groupId[] }` (yalnız
seçeneği olan ürünler). POS satış ekranı bununla, ürüne tıklandığında **seçenek
diyaloğu gerekip gerekmediğine** tek istekte karar verir: seçenek yoksa doğrudan
sepete ekler (aynı ürüne tekrar tıklanırsa adet artar), varsa diyalog açar.

## Katlar & Masalar (kat/masa) — dine-in

| Method | Path | Yetki | Açıklama |
|---|---|---|---|
| `GET` | `/api/pos/floors` | `pos.tables.manage` | katları listele |
| `POST/PATCH/DELETE` | `/api/pos/floors[/:id]` | `pos.tables.manage` | kat oluştur/güncelle/sil |
| `GET` | `/api/pos/tables?floorId=` | `pos.tables.manage` | masaları listele |
| `POST/PATCH/DELETE` | `/api/pos/tables[/:id]` | `pos.tables.manage` | masa oluştur/güncelle/sil |
| `GET` | `/api/pos/floors/layout?branchId=` | `pos.sell` | **kat haritası** + canlı doluluk |

`layout` her masayı açık siparişiyle döner (`openOrderId`, `openOrderNo`,
`openTotal`). Dine-in akışı: garson masa seçer → boşsa `tableId` ile yeni adisyon
açılır, doluysa mevcut açık sipariş yüklenir (masa "tab"ı). `PosOrder.tableId`
siparişi masaya bağlar; `orderType: 'dine_in'`.

---

## POS API

Tüm yollar `/api` ön ekiyle ve `Authorization: Bearer <token>` ile çağrılır.

### Kasalar (registers) — `pos.registers.read/write`

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/api/pos/registers` | kasaları listele |
| `POST` | `/api/pos/registers` | kasa oluştur `{name, code?, branchId, salesChannelId?, defaultCashAccountId?, settings?}` |
| `GET/PATCH/DELETE` | `/api/pos/registers/:id` | oku / güncelle / sil |

`settings` (jsonb): `cartSide: 'left'|'right'`, `taxInclusive`, `kitchenEnabled`,
`receiptHeader`, `receiptFooter` (bkz. `DEFAULT_REGISTER_SETTINGS`). Kasaya bir
`salesChannelId` atanırsa o kanalın `ProductChannelPrice` fiyatları kullanılır.

### Vardiyalar (sessions) — `pos.session.open/close`

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/api/pos/sessions` | vardiyalar (query: registerId/status) |
| `POST` | `/api/pos/sessions` | aç `{registerId, openingCash?}` |
| `POST` | `/api/pos/sessions/:id/close` | kapat `{countedCash?, notes?}` (X/Z) |

### Siparişler (orders) — `pos.sell` vb.

| Method | Path | Açıklama |
|---|---|---|
| `GET` | `/api/pos/orders` | listele (registerId/sessionId/status/contactId/from/to) |
| `GET` | `/api/pos/orders/:id` | tek sipariş (satırlar + modifierlar + ödemeler) |
| `POST` | `/api/pos/orders` | oluştur (aşağıya bak) |
| `PATCH` | `/api/pos/orders/:id` | açık siparişi düzenle (satırları değiştir) |
| `POST` | `/api/pos/orders/:id/payments` | tahsilat ekle (split/çoklu tender) |
| `DELETE` | `/api/pos/orders/:id/payments/:paymentId` | açık siparişten tahsilat sil |
| `POST` | `/api/pos/orders/:id/settle` | tam ödendiyse kapat (genelde otomatik) |
| `POST` | `/api/pos/orders/:id/split` | `{lineIds:[…]}` → seçili satırları alt-siparişe taşı |
| `POST` | `/api/pos/orders/:id/void` | `{reason?, refund?}` iptal/iade |
| `DELETE` | `/api/pos/orders/:id` | ödenmemiş siparişi sil |

**Sipariş oluşturma gövdesi:**

```jsonc
{
  "clientRef": "uuid-on-device",      // idempotency (offline-güvenli)
  "registerId": "…",
  "sessionId": "…",                   // yoksa kasanın açık vardiyası kullanılır
  "orderType": "takeaway",            // dine_in | takeaway | delivery
  "contactId": null,                  // hesaba satış için cari
  "lines": [
    {
      "productId": "…",               // sunucu ad/fiyat/KDV'yi buradan çözer
      "qty": 2,
      "modifiers": [{ "optionId": "…" }]  // sunucu ad+priceDelta'yı çözer
    }
  ]
}
```

`name`, `unitPrice`, `taxRate` (satır) ve `groupName/optionName/priceDelta`
(modifier) yalnızca **override** için gönderilir. `productId`'siz serbest satır
için `name` + `unitPrice` zorunludur.

---

## Tahsilat, bölme & çoklu tender

Bir siparişte **N adet `PosPayment`** olabilir — eşit bölme, tutara göre bölme ve
karışık tender (nakit + kart + cari) hepsi buraya yazılır:

```
POST /pos/orders/:id/payments  { method, amount, ... }
  method: "cash"    → cashAccountId zorunlu; tendered? (para üstü için)
  method: "card"    → bankAccountId zorunlu
  method: "account" → contactId (yoksa sipariş cari'si) — hesaba yaz
  method: "other"
```

- Sunucu her tahsilattan sonra `paidTotal` ve `changeDue`'yu yeniden hesaplar.
- **Para üstü yalnız nakitte**: `changeGiven = max(0, tendered − kalan)`; uygulanan
  tutar `min(tendered, kalan)` ile sınırlanır. Nakit-dışı tender kalanı aşamaz.
- `paidTotal >= grandTotal` olunca sunucu **bir kez** `settle` eder
  (idempotent — tekrar tetiklenmez).

**Ürün seçerek ayrı fiş** = `POST /pos/orders/:id/split {lineIds}`: seçili satırlar
yeni bir **alt-sipariş**e (`parentOrderId`) taşınır; her sipariş ayrı ödenir/yazdırılır
(en az bir satır ana siparişte kalmalı).

---

## Settle → stok / kasa / cari akışı

`settleInTx` (tek `manager.transaction`):

```
1) STOK   — trackStock !== false olan her satır için:
            StockMovementsService.post(em, { direction:'out', qty, branchId,
              sourceModule:'pos', sourceId: order.id, movementType: 'Satış Çıkışı' })
2) KASA/BANKA — her cash/card ödemesi için:
            FinanceTransaction { type:'in', amount, cashAccountId|bankAccountId }
            → payment.financeTransactionId'e geri bağlanır
3) CARİ   — her account ödemesi için:
            ContactTransaction { debit: amount, sourceModule:'pos', sourceId }
            → payment.contactTransactionId'e geri bağlanır
4) order.status = 'paid'
```

**İptal/iade** (`void` + `refund:true` ya da ödenmemişse `void`):

```
reverseSettle: StockMovementsService.reverseSource('pos', order.id)   // stok geri
               + payment.financeTransactionId / contactTransactionId  // satırları sil
status → 'refunded' (ödenmişti) | 'voided' (ödenmemişti)
```

`FinanceTransaction`'da `sourceModule` alanı olmadığından geri alma, `PosPayment`
üzerinde saklanan `financeTransactionId` / `contactTransactionId` ile yapılır
(tıpkı `InvoicePayment` gibi).

---

## Yetkiler (RBAC)

Grup **'POS'** (`pos.permissions.ts` + `permissions.catalog.ts`):

```
pos.registers.read   pos.registers.write   pos.sell
pos.session.open     pos.session.close
pos.discount.line    pos.discount.override pos.price.override
pos.refund           pos.void              pos.drawer.open
pos.reprint          pos.reports
pos.kitchen.view     pos.kitchen.bump      pos.tables.manage
pos.settings         pos.users.pin
inventory.modifiers.read   inventory.modifiers.write
```

---

## Masaüstü istemci entegrasyonu

Masaüstü (veya başka) bir istemci tüm akışı yalnızca HTTP/JSON ile uygular —
sunucu hiçbir oturum durumu (sepet vb.) tutmaz, "kaynak gerçeği" siparişlerdir:

1. **Açılış:** `POST /api/auth/pos-login {username, pin}` → token sakla.
   Vardiya yoksa `POST /api/pos/sessions {registerId, openingCash}`.
2. **Katalog:** `GET /api/inventory/products` (+ `…/:id/modifiers`), gerekiyorsa
   kasanın `salesChannelId`'sine göre fiyatlar. Fiyat **sunucuda** çözüldüğü için
   istemci fiyat hesaplamak zorunda değildir.
3. **Sepet → sipariş:** her cihazda bir `clientRef` üret, `POST /api/pos/orders`.
   Aynı `clientRef` ile tekrar POST → aynı sipariş (offline kuyruğu güvenli).
4. **Tahsilat:** bir veya çok `POST /api/pos/orders/:id/payments`; sunucu
   `remainingTotal`/`changeDue` döner, tam ödemede otomatik `settle`.
5. **Fiş:** `GET /api/pos/orders/:id` tüm snapshot'ı verir; istemci yerel yazıcıya
   basar (kasa `settings.receiptHeader/Footer`).
6. **İptal/iade:** `POST /api/pos/orders/:id/void {refund:true}`.
7. **Kasiyer değişimi:** `POST /api/auth/pos-switch {pin}`.

İdempotency (`clientRef`), sunucu-tarafı fiyatlandırma ve durağan-olmayan sunucu
sayesinde istemci basit tutulabilir; çevrimdışıyken kuyruğa al, bağlanınca aynı
`clientRef`'lerle gönder.

---

## Doğrulama

- Birim: `backend/src/modules/pos/pos-pricing.spec.ts` (KDV-dahil/hariç matrah,
  modifier delta, indirim).
- Uçtan uca (HTTP, gerçek token): modifier → PIN giriş/switch (+401) → kasa/vardiya
  → sunucu-çözümlü fiyatla sipariş → çoklu tender bölme (kart kısmi + nakit para
  üstü) → settle (stok+kasa) → iade (stok+kasa geri) → ürün-bölme → 401/400.

> **Durum:** Faz 1 (perakende çekirdek) backend TAMAM. Faz 2 (KDS + masa +
> sipariş tipleri) ve Faz 3 (mobil sipariş alma + offline + raporlar + fiş)
> planlandı.
