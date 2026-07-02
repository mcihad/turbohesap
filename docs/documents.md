# Evrak Yönetim Sistemi (Document Management) + Çek/Senet

TurboHesap'ın genel amaçlı **evrak yönetim sistemi**: ağaç yapılı **kategoriler**
(ürün kategorileri gibi, özel öznitelik şemasıyla), **etiketler**, jsonb
**metadata** (ileride OCR için ayrılmış alanlar), **süreli evrak** takibi
(hesaplanan `expiryStatus`), ve gerçek server-side **gizlilik** (kişiye özel
evrak/kategoriler). Bunun üzerine, finans modülüne **Çek/Senet** portföyü
eklendi — sistemdeki her çek/senet otomatik olarak bir Evrak kaydına sahip olur.

İlgili belgeler: [`modules.md`](./modules.md) (`/api/<module>/<resource>`
yakınsaması), `../AGENTS.md` §5.4 (files/settings/lookups altyapısı — bu modül
`files`'ı olduğu gibi kullanır), [`pos.md`](./pos.md) / [`production.md`](./production.md)
(atomik muhasebe kaydı deseni — Çek/Senet bunu birebir kullanır).

---

## Tasarım kararları

1. **`documents` hiçbir iş modülünü tanımaz.** Kategori ağacı ve evrak kayıtları
   tamamen bağımsız, genel amaçlı bir sistemdir. Diğer modüller (Finans/Çek-Senet,
   ileride Demirbaş'ın araç muayene/sigortası, İK'nın personel evrakları…)
   polymorphic `relatedEntityType`/`relatedEntityId` ile bir Evrak kaydına
   **işaret eder** — `documents` asla onları import etmez. Bu yön tek yönlü ve
   kesindir (`iam`↔`org` Branch ilişkisiyle aynı türde sanctioned istisna).
2. **Kategori ağacı, envanter kategorileriyle birebir aynı desen.** Adjacency
   list (`parentId`), cycle guard, children varken silme engeli, silince
   unlink-not-cascade, ve ata→çocuk **merge** eden özel öznitelik şeması
   (`fieldDefs`, jsonb) — `effectiveDocumentFieldDefs` inventory'nin
   `effectiveFieldDefs`'inin birebir kopyasıdır (tip paylaşılmaz, desen
   paylaşılır — her modül kendi tam kontratına sahip olur).
3. **Süreli evrak durumu hesaplanır, hiç saklanmaz.** `expiryStatus` ('none' |
   'active' | 'expiring_soon' | 'expired') `expiryDate`+`reminderDaysBefore`'dan
   okuma anında türetilir (finans bakiyeleri gibi — "computed, never stored").
   Bildirim/hatırlatma (cron/push) **kapsam dışı** — kullanıcı isteği "buradan
   takip edilsin" (görünürlük), "bana bildir" değil; ileride ayrı bir iş.
4. **Gizlilik gerçek, sunucu tarafında zorunlu kılınır — sadece arayüz filtresi
   değil.** `Document`/`DocumentCategory`'de `isPrivate`+`ownerId`. `list()`/`get()`
   sorgusunun kendisi filtreler:
   `WHERE isPrivate=false OR ownerId=:userId [OR privateReadAll varsa koşul kalkar]`.
   `get()` başarısızsa **404** döner (403 değil — kaydın varlığı sızdırılmaz).
   Kategori-seviyesi `isPrivate`, içindeki evraklara **canlı cascade olarak
   uygulanmaz** — yalnızca evrak oluşturma anında bir varsayılan sağlar (kategori
   sonradan değişse bile mevcut evraklar etkilenmez). Bu, repodaki tek gerçek
   satır-seviyesi erişim kontrolü örneğidir (contacts'taki `?mine=` yalnızca
   opt-in bir kolaylık filtresidir, zorunlu değildir).
5. **Dosyalar yeniden icat edilmedi.** Bir evrağın taranmış hali/fotoğrafı
   mevcut `/api/files`'a `entityType='Document'` ile eklenir — sıfır ek backend
   kodu. Bir evrak sıfır dosyaya sahip olabilir (taranmamış kağıt takibi) veya
   birden fazla.
6. **İzinler ince taneli.** `documents.categories.{read,write}`,
   `documents.documents.{read,write,delete}` (silme ayrı, daha güçlü bir eylem),
   `documents.private.readAll` (başkasının özelini görme),
   `documents.private.manage` (başkasının gizlilik/sahiplik alanını değiştirme),
   `documents.tags.manage` (toplu etiket bakımı).

---

## Veri modeli

```
document_categories   (parentId, name, code, isActive, sortOrder,
                        isPrivate, ownerId, fieldDefs jsonb[])
documents              (categoryId, title, code, description,
                        attributes jsonb{}, tags jsonb[], metadata jsonb{},
                        ocrText/ocrStatus — reserved, unused today,
                        isTimeBound, issueDate, expiryDate, reminderDaysBefore,
                        isPrivate, ownerId,
                        relatedEntityType, relatedEntityId — polymorphic link,
                        createdById)
```

`fieldDefs` 10 alan tipini destekler: text/textarea/number/money/boolean/
select/multiselect/date/daterange/lookup — envanter kategorileriyle aynı.

---

## Çek/Senet (finans üzerine inşa edildi)

`finance_instruments` — tek entity, `instrumentType`('check'|'note') +
`direction`('received'|'issued') ile ayrışır (alanların ~%90'ı ortak; banka
alanları yalnız çek için dolu). Durum makinesi **yöne göre dallanır**:

- **Alınan** (received): `open` → `in_collection` (tahsile verildi) →
  `collected` (tahsil edildi, TERMİNAL — finance IN + cari alacak) |
  `bounced` (karşılıksız) | `endorsed` (ciro edildi) | `pledged` (teminata
  verildi). `open` → `cancelled` de mümkün.
- **Verilen** (issued): `open` → `paid` (ödendi, TERMİNAL — finance OUT + cari
  borç) | `bounced` | `cancelled`.
- `collected`/`paid` → `reverse` → `open` (atomik geri alma).

**Otomatik evrak bağı:** bir çek/senet oluşturulduğunda, sistem kategorisi
"Çek/Senet" (`code='CEK_SENET'`) idempotent find-or-create edilir (`StockMovementTypesService.systemTypeId`
desenindeki gibi), bu kategori altında `isTimeBound=true, expiryDate=dueDate`
ile bir `Document` açılır, `FinancialInstrument.documentId` bu evraka işaret
eder. `dueDate`/`issueDate` PATCH ile değişirse evrak senkronize edilir.
**Silme** (yalnız `status='open'` iken izinli) evrağı silmez — yalnızca
`relatedEntityType`/`relatedEntityId`'sini `null`'a çeker; evrak geçmiş kaydı
olarak durur.

**Atomik muhasebe kaydı** (`collect`/`pay`/`reverse`) `invoices.addPayment`/
`cancel` deseninin birebir kopyası: tek `manager.transaction`, bir
`FinanceTransaction` (`type:'in'|'out'`) + bir `ContactTransaction`
(`documentType:'check'|'note'`) oluşturulur, oluşturulan id'ler enstrüman
satırına yazılır (`financeTransactionId`/`contactTransactionId`) — `reverse`
bu id'lerle **arama değil, doğrudan silme** yapar. Alınanın tahsili cariyi
**alacaklandırır** (credit — borcu azaltır, tahsilat deseni); verilenin ödemesi
cariyi **borçlandırır** (debit — ödeme deseni), tıpkı fatura tahsilat/ödemesi
gibi.

**Kapsam dışı bırakılan (MVP basitleştirmesi):** `endorse`/`pledge` yalnızca
durum değiştirir, zorunlu bir muhasebe kaydı atmaz — ciro'nun başka bir
alacağı/enstrümanı mahsup etmesi ayrı bir "hedef enstrüman" bağlantısı
gerektirir, şimdilik kapsam dışı.

---

## API

| Endpoint | Açıklama |
| --- | --- |
| `GET/POST /api/documents/categories[/:id]`, `PATCH/DELETE .../:id` | Evrak kategorileri (ağaç) |
| `GET /api/documents/documents?categoryId=&tag=&isPrivate=&mine=&expiryStatus=&relatedEntityType=&relatedEntityId=&search=` | Evrak listesi (gizlilik server-side filtrelenir) |
| `GET/POST /api/documents/documents[/:id]`, `PATCH/DELETE .../:id` | Evrak CRUD |
| `GET /api/documents/tags`, `POST .../rename`, `DELETE .../:tag` | Toplu etiket bakımı (`tagsManage`) |
| `GET/POST /api/finance/instruments[/:id]`, `PATCH/DELETE .../:id` | Çek/Senet CRUD (yalnız `status='open'` iken düzenlenebilir/silinebilir) |
| `POST .../:id/deposit-for-collection\|bounce\|endorse\|pledge\|cancel` | Durum-only geçişler |
| `POST .../:id/collect\|pay` `{cashAccountId\|bankAccountId, date, description?}` | Atomik tahsilat/ödeme |
| `POST .../:id/reverse` | Atomik geri alma |

## İzinler

**Evrak** (`DocumentsPermissions`): `categoriesRead/Write`, `documentsRead/Write/Delete`,
`privateReadAll`, `privateManage`, `tagsManage`.

**Finans/Çek-Senet ekleri** (`FinancePermissions`): `instrumentsRead`,
`instrumentsWrite` (create + açıkken düzenle/sil), `instrumentsSettle`
(collect/pay/reverse — muhasebe kaydı atan eylemler), `instrumentsStatus`
(deposit-for-collection/bounce/endorse/pledge/cancel).

---

## §13 doğrulama özeti (uygulandı)

Kategori ağacı (cycle/children guard), evrak CRUD + `expiryStatus` hesaplama
(geçmiş/yakın/uzak/süresiz 4 senaryo), **gizlilik testi**: `privateReadAll`'ı
olmayan bir kullanıcı başkasının özel evrağını listede göremiyor ve doğrudan
`GET` ile **404** alıyor; izin verilince ikisi de başarılı. Çek/Senet: oluşturma
→ bağlı evrak doğru alanlarla açılıyor; `collect`/`pay` → doğru
`FinanceTransaction`/`ContactTransaction` + kasa/banka bakiyesi (hesaplanan)
doğru değişiyor; `reverse` → ikisi de silinip bakiye geri dönüyor;
status-only geçişler hiç finans/cari satırı yaratmıyor; yön/durum guard'ları
(`collect` verilende→400, `pay` alınanda→400, `collected` sonrası
düzenle/sil→400) ve silme→evrak-unlink senkronizasyonu doğrulandı.
