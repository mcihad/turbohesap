# Üretim (Manufacturing / MRP)

TurboHesap'ın üretim modülü: **ürün reçeteleri (BOM)**, **iş merkezleri**,
**Üretim Emri (MO)** ve **İş Emri (WO)** yürütme, **hareketli ortalama (AVCO)
maliyet**, **stok rezervasyonu + ATP**, **fason**, **MRP planlama + MTO**, ve
**kalite + parti/seri izlenebilirlik**. Envanterle birebir entegredir — tüm stok
etkileri mevcut `StockMovementsService` üzerinden tek transaction'da yazılır — ve
ATP kontratı ileride eklenecek **e-ticaret** modülünün de temelidir.

İlgili belgeler: [`auth.md`](./auth.md) (JWT + RBAC), [`modules.md`](./modules.md)
(`/api/<module>/<resource>` yakınsaması), [`pos.md`](./pos.md) (aynı
stok/muhasebe deseni), `../AGENTS.md` (mimari).

Tasarım araştırması: Odoo MRP, ERPNext, Katana, MRPeasy, SAP B1, D365 BC,
NetSuite + Türkiye (fason / iş emri / reçete) bağlamı.

---

## Tasarım kararları

1. **Tek stok motoru.** Üretimin TÜM stok etkileri
   `StockMovementsService.post(em, …)` / `reverseSource(em, 'production', moId)`
   ile, MO'nun transaction'ında yazılır. Ayrı bir "üretim stok defteri" yoktur;
   iptal/geri alma tek `reverseSource` çağrısıdır. Fason ve invoices/pos ile
   **birebir** aynı desen.
2. **WIP = değer (virtual location değil).** Yarı mamul ara-lokasyon hareketi
   yazılmaz. Bileşenler tamamlamada **sarf** (çıkış) edilir, mamul aynı anda
   **giriş** yapılır; maliyet farkı mamul birim maliyetine biner.
3. **Hareketli ortalama (AVCO).** Her birim maliyetli `in` hareketi ürünün
   ortalamasını günceller:
   `newAvg = (öncekiMiktar·eskiAvg + girenMiktar·girenMaliyet) / (öncekiMiktar+girenMiktar)`.
   `out` hareketleri mevcut ortalamadan değerlenir, ortalamayı değiştirmez.
   (product, variant?, branch?) bazında `inventory_product_costs` tablosunda.
4. **Rezervasyon = alan, defter satırı değil.** Onaylı MO bileşenleri
   `ProductStock.reservedQty`'yi artırır (on-hand sabit kalır). `available =
   quantity − reservedQty`. `inventory_stock_reservations` kaynak etiketiyle
   (`sourceModule`/`sourceId`) toplu serbest bırakılır.
5. **ATP (söz verilebilir).** `available + gelen`; gelen = ufuk içindeki planlı
   girişler (açık MO çıktısı + açık satınalma siparişi). Shared serviste expose
   edilir; orders + e-ticaret + MRP aynı kontratı tüketir.
6. **Snapshot her yerde.** MO onaylanınca reçete (bomId+version), bileşenler,
   yan ürünler ve operasyonlar MO'ya **kopyalanır**; sonradan reçete değişse de
   geçmiş emir değişmez.
7. **Gerçek birim (UoM).** Dönüşüm yalnız kategori içinde
   (`qty_ref = qty·from.factor; qty_target = qty_ref / to.factor`).
8. **Bağımlılık yönü.** `production`, `orders`/`inventory` entity'lerini
   yalnız **okur** (forFeature read-only). `orders → production` sert bağımlılık
   yoktur; MTO **çekme** (pull) ile çalışır (planlama açık siparişi okur).

---

## Veri modeli (özet)

```
inventory_uom_categories ──< inventory_uoms            (factorToReference, rounding)
inventory_product_costs         (AVCO: method, avgCost, currency)   ── (product,variant?,branch?)
inventory_stock_reservations    (quantity, status active|released|consumed, sourceModule/sourceId)
inventory_product_stocks.reservedQty   +   inventory_stock_movements.unitCost   (yeni kolonlar)

production_work_centers          (costPerHour, efficiencyRate, parallelCapacity, setup/cleanup)
production_boms                  (product, code, type manufacture|phantom|subcontract, outputQuantity, version, consumptionPolicy)
   ├─< production_bom_components   (component, quantity, scrapRate, operationId?, consumptionType, isOptional)
   ├─< production_bom_byproducts   (product, quantity, costShareRate)
   └─< production_bom_operations   (sequence, workCenterId, setup/timePerUnit, timeBasis, qualityCheckRequired)

production_orders (Üretim Emri: orderNo UE-#####, product, bom snapshot, type, sourceMode mts|mto,
   plannedQty/producedQty/scrappedQty, status draft|confirmed|in_progress|done|cancelled, priority,
   componentSourceBranchId/targetBranchId/wipBranchId, consumptionMode backflush|manual,
   maliyet snapshot: std/actual material+operation+overhead, subcontractServiceCost, byproductCredit, totalCost, unitCost)
   ├─< production_order_components  (required/reserved/consumed qty, sourceBranchId, unitCost, totalCost — patlatma snapshot)
   ├─< production_order_byproducts  (quantity, producedQuantity, costShareRate, unitCost)
   └─< production_work_orders (İş Emri: operationId snapshot, sequence, workCenterId,
             status pending|ready|in_progress|paused|done|cancelled, planned setup/run min, actualMinutes, qualityCheckRequired)
                └─< production_work_order_time_logs (startedAt/endedAt/durationMinutes)

production_subcontract_dispatches (Fason: dispatchNo FS-#####, contactId, status draft|sent|received|cancelled, serviceCost)
   └─< production_subcontract_dispatch_lines (component, sentQuantity, returnedQuantity)

production_reorder_rules (min/max, order-up-to)
production_planning_runs (runNo PLN-#####, status draft|applied|cancelled, horizonDays)
   └─< production_planning_suggestions (product, suggestionType manufacture|purchase, reason reorder|sales_order|dependent_demand,
             requiredQuantity, level, status pending|applied|dismissed, createdManufacturingOrderId)

production_quality_checks (result pass|fail, inspected/passed/rejected qty, checkType operation|final|incoming)
production_lots (lotNo, kind lot|serial — (product,lotNo) unique)
   ← production_order_lots (role consumed|produced, quantity)   → şecere/recall
```

---

## Yaşam döngüsü

### Üretim Emri (MO)
- **create** → `draft`. `plannedQuantity`, kaynak/hedef şube, öncelik, tarihler.
- **confirm** (`draft → confirmed`): aktif reçete çözülür (yoksa 400), **phantom
  özyinelemeli** patlatılır (yalnız yaprak bileşenler snapshot'lanır), yan ürün +
  operasyonlar snapshot'lanır, operasyonlardan **İş Emirleri** üretilir
  (ilk operasyon `ready`, kalanlar `pending`), zorunlu-otomatik bileşenler
  **rezerve** edilir (`reservedQty↑`). Standart maliyet (malzeme + operasyon) yazılır.
- **complete** (`confirmed|in_progress → done`): `producedQuantity` (+`scrappedQuantity`?).
  Bileşenler **sarf** edilir (`Üretime Sarf` çıkış @ güncel AVCO; backflush =
  `required × (üretilen+fire)/planlanan`, manuel = `componentConsumptions` ile).
  Operasyon maliyeti = İş Emri gerçek dakika (yoksa planlı) × iş merkezi saat
  ücreti (+ fason ücreti). Yan ürünler girer (maliyet payı `costShareRate`).
  `producedUnitCost = (malzeme + operasyon + genel − yanÜrünKredisi) / üretilen`.
  Mamul **girer** (`Üretimden Giriş` @ producedUnitCost → mamul AVCO güncellenir).
  Rezervasyonlar `consumed` kapatılır.
- **cancel** (`done` hariç): `reverseSource('production', moId)` tüm hareketleri
  geri alır + rezervasyonlar `released`, İş Emirleri `cancelled`.

### İş Emri (WO) — saha terminali
`start` (→ in_progress, zaman logu açılır, MO otomatik in_progress) · `pause`
(logu kapatır, süreyi biriktirir) · `resume` · `finish` (üretilen/red miktar,
sonraki operasyonu `ready` yapar). `qualityCheckRequired` ise geçen (pass) bir
kalite kaydı olmadan **finish 400 verir**.

---

## API (hepsi `/api/production/…`, `api.production.<resource>.<method>()`)

| Kaynak | Uç noktalar |
| --- | --- |
| `work-centers` | CRUD |
| `boms` | CRUD (iç içe components/operations/byproducts) |
| `orders` | CRUD · `POST :id/confirm` · `POST :id/complete` · `POST :id/cancel` · `POST from-demand` (MTO) |
| `work-orders` | list/get · `POST :id/start\|pause\|resume\|finish` |
| `subcontract-dispatches` | list/get/create · `POST :id/send\|receive\|cancel` · `GET /subcontract-stock` |
| `reorder-rules` | CRUD |
| `planning-runs` | list/get · `POST` (run) · `POST :id/apply` · `POST :id/cancel` |
| `quality-checks` | list/get · `POST` (record) |
| `lots` | list/create · `POST /consume\|/produce` · `GET :id/trace` · `GET /lot-links?manufacturingOrderId=` |

Envanter tarafı (bu modülün eklediği): `GET /api/inventory/availability`
(+`/bulk`), `GET /api/inventory/cost`, `/api/inventory/reservations`
(+`/release`). `CreateStockMovementRequest.unitCost` maliyetli girişleri AVCO'ya
besler.

---

## İzinler (`ProductionPermissions`, grup "Üretim")

`production.read` · `production.write` (iş merkezi/reçete) ·
`production.orders.write|confirm|complete|cancel` ·
`production.workorders.execute` (saha başlat/duraklat/bitir) ·
`production.subcontract.manage` · `production.planning.run` ·
`production.quality.manage` (kalite + lot). Mobil saha kullanıcıları çoğunlukla
`workorders.execute`.

---

## Maliyet (AVCO) — çalışılmış örnek

Reçete: Mamul X ← A×2 (@15) + B×3 (@5), operasyon 30 dk/adet @60 TL/saat, yan ürün
Y×1 (payı %10). MO planlanan 10 adet, tamamlanan 10:
- malzeme = 20·15 + 30·5 = **450**
- operasyon = (30·10/60)·60 = **300**
- brüt = 750; yan ürün kredisi = %10·750 = **75** → Y 10 adet @ 7.5
- **mamul birim maliyet = (750 − 75) / 10 = 67.5**, X AVCO güncellenir.

(Fason emrinde brüte fason ücreti eklenir: 320 malzeme + 100 operasyon + 500 fason
= 920 → birim 92.)

---

## MRP planlama

`planning-runs POST` talep vs arzı netler:
- **Talep**: min/max reorder (available < min → max seviyesine tamamla) + açık
  satış siparişleri (MTO).
- **Arz (net)**: ATP (`on-hand − reserved + açık MO/PO`).
- Net ihtiyaç **çok seviyeli reçete patlatılır** (bağımlı talep); üretilebilir →
  MO önerisi, satın alınan → satınalma önerisi. `apply` üretim önerilerini
  **taslak MO**'ya çevirir. Örn. FP(reorder 10) → SA(bağımlı 10) → RM(satınalma 20).

---

## Fason (subcontracting)

`type='subcontract'` MO + `subcontract-dispatches`: sevk belgesi (draft) →
`send` (fasoncuya) → `subcontract-stock` = gönderilen − iade → `receive`
(fason ücreti MO maliyetine eklenir). Malzeme değerlemede (valuation) kalır;
rezervasyon "başka emre gitmesin" görevini görür.

---

## Kalite + Parti/Seri

- **Kalite**: operasyon/mamul bazlı geç/kal. `qualityCheckRequired` iş emri geçen
  kayıt olmadan bitmez; red miktarı kaydedilir.
- **Lot/Serial**: `lots/consume` ve `lots/produce` üretim emrine tüketilen/üretilen
  parti bağlar. `lots/:id/trace` iki yönlü şecere verir: **ileri** (bu mamul
  partisini üreten emrin tükettiği hammadde partileri) ve **geri çağırma**
  (bu hammadde partisini tüketen emirlerin ürettiği mamul partileri).

---

## §13 doğrulama

Her dalga gerçek token ile HTTP üzerinden doğrulandı (130 kontrol, hepsi yeşil):
W2 (MO/WO/AVCO/rezervasyon/ATP) 54, W3 (fason) 25, W4 (planlama/MTO/ATP) 32,
W5 (kalite/lot) 19 + W1 (UoM/BOM). Yeni sayısal kolonlar `numeric` (float yok),
401/403/400/404 uçları kontrol edildi, migration drift'i temizlendi.
