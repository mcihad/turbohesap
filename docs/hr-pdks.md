# İK · PDKS — Vardiya, Geofence Giriş/Çıkış ve Kartlı Geçiş

Bu belge, HR modülüne eklenen PDKS (Personel Devam Kontrol Sistemi) yeteneklerini
ve özellikle **kartlı geçiş veri içe aktarma standardını** tanımlar. Standart
vendor-bağımsızdır; ileride bu standarda uyan üçüncü parti sistemlerden veri almak
için bir HTTP ingest sunucusu kurulabilir.

## Genel mimari
- **Vardiya**: `hr_shifts` (tanım + mola), `hr_shift_rotations` (döngü şablonu),
  `hr_employee_shifts` (kural: personel ↔ rotasyon/sabit vardiya, tarih aralığı),
  `hr_employee_shift_days` (materialize takvim, `generate` ile üretilir, elle
  override edilebilir).
- **Geofence giriş alanları**: `hr_checkin_areas` — PostGIS geometri kolonu her
  zaman **`geom`** (SRID 4326), Polygon **veya** Point. `toleranceMeters` poligonda
  dışa tampon / noktada yarıçaptır. `timeWindows` (jsonb) izinli saat aralıkları
  (boş = her zaman). Personel-alan ataması `hr_employee_checkin_areas`; **atama
  yoksa personel tüm aktif alanlardan** giriş yapabilir.
- **Giriş/çıkış kaydı**: `hr_attendance_records` — mobil GPS, kart ve elle
  kayıtların tek tablosu (`method` ayırır). Doğrulama:
  `ST_DWithin(geom::geography, nokta::geography, toleranceMeters)` + saat penceresi
  + accuracy. Sonuç `status` = `valid | flagged | rejected`, `flagReason` ile.
- İzinler (group **İK-PDKS**): `hr.shifts.{read,write,assign}`,
  `hr.areas.{read,write,assign}`, `hr.attendance.{read,checkin,manage}`,
  `hr.cards.{read,write,import}`.

## Mobil giriş/çıkış (geofence)
Endpoint `POST /api/hr/attendance/checkin` (izin `hr.attendance.checkin`). Cihaz
GPS konumunu gönderir; sunucu personelin izinli alanlarını (yoksa tüm aktif
alanları) çözer, en yakın alanı bulur, `ST_DWithin` + saat penceresi + accuracy ile
doğrular.

```json
// İstek
{ "direction": "in", "lat": 41.0, "lng": 29.0, "accuracyMeters": 12, "isMockLocation": false }
// Yanıt
{ "accepted": true, "message": "Merkez Şantiye — giriş kabul edildi",
  "record": { "status": "valid", "withinGeofence": true, "withinTimeWindow": true,
              "distanceMeters": 0, "area": { "name": "Merkez Şantiye", "code": "AREA-1" } } }
```
`flagReason` değerleri: `no_area`, `outside_area`, `outside_window`,
`low_accuracy`, `mock_location` (virgülle birleşik olabilir).

## Kartlı geçiş — veri standardı (vendor-bağımsız)

### Toplu içe aktarma
Endpoint `POST /api/hr/attendance/import` (izin `hr.cards.import`).

```json
{
  "source": "zkteco-adms",
  "deviceId": "ZK-GATE-01",
  "events": [
    {
      "externalId": "ZK-GATE-01:9912841",
      "cardNo": "0006541234",
      "personnelId": "1042",
      "terminalId": "Ana Giriş Turnike",
      "readerId": "MAIN-TURNSTILE",
      "direction": "in",
      "eventTime": "2026-06-30T08:03:12+03:00",
      "eventType": "attendance",
      "verifyMode": "card",
      "raw": { "pin": "1042", "status": "0" }
    }
  ]
}
```

Yanıt: `{ received, inserted, duplicates, unmatched, rejected, errors[] }`.

### AccessEvent alanları
| Alan | Tip | Açıklama |
| --- | --- | --- |
| `externalId` | string? | **Idempotency anahtarı** (kaynak başına benzersiz). Yoksa `sha256(deviceId\|cardNo\|eventTime\|direction)` ile türetilir. |
| `cardNo` | string? | Kart numarası — **string** (baştaki sıfırlar korunur). |
| `personnelId` | string? | Cihaz kullanıcı/PIN'i. |
| `employeeRef` | object? | Açık eşleme ipucu: `{ byCardNo \| byExternalPersonnelId \| byTcKimlik }`. |
| `deviceId` | string | **Zorunlu** — terminal seri/kimliği. |
| `terminalId` / `gateId` / `readerId` | string? | İnsan-okunur etiket / kapı / okuyucu. |
| `direction` | enum | `in \| out \| unknown`. |
| `eventTime` | string | **Zorunlu** — ISO 8601, **offsetli** (`2026-06-30T08:03:12+03:00`). |
| `eventType` | enum | `attendance \| access_granted \| access_denied \| door` (varsayılan `attendance`). |
| `verifyMode` | string? | `card \| fp \| face \| pwd`. |
| `raw` | object? | Orijinal vendor verisi (denetim için saklanır). |

### CSV alternatifi
```
external_id,card_no,personnel_id,device_id,gate_id,direction,event_time,event_type,verify_mode
EVT-100245,"0006541234",1042,ZK-GATE-01,MAIN-TURNSTILE,in,2026-06-30T08:03:12+03:00,attendance,card
```
`card_no` tırnak içinde verilir (baştaki sıfırlar). `event_time` offsetsizse organizasyon
saat dilimi (varsayılan `Europe/Istanbul`) varsayılır.

### Personel eşleme sırası
1. `employeeRef` (açık ipucu) → 2. `employee.cardNo` → 3. personel kartı
(`hr_employee_cards.cardNo`, aktif) → 4. `externalPersonnelId`. Eşleşmeyen kayıt
`employeeId=null` + `status=flagged` (`flagReason=unmatched_card`) olarak girer ve
ayarlardan elle eşlenebilir.

### Idempotency / tekrar içe aktarma
`(source, externalId)` üzerinde kısmi unique index (`external_id IS NOT NULL`) +
uygulama düzeyinde ön-kontrol. Aynı dosyayı tekrar içe aktarmak güvenlidir →
`duplicates` olarak sayılır, yeni satır eklenmez.

### Kartlı kaynaklar (ayarlar)
`hr_card_sources`: `name`, `code`, `kind`, `config`, `timezone`,
`directionMapping`, `apiKey` (maskeli — ileride HTTP ingest için), `isActive`.
Açılışta bir varsayılan `generic` kaynak seed edilir.

> İleride: bu standarda uyan bir **HTTP ingest sunucusu** (kaynak `apiKey` ile
> kimlik doğrulamalı) eklenerek üçüncü parti turnike/kart sistemlerinden gerçek
> zamanlı aktarım yapılabilir. Puantaj (reconciliation) bağlantısı da bir sonraki
> aşamadır — şu an kayıtlar ham tutulur.
