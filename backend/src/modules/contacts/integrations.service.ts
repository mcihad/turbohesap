import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as nodemailer from 'nodemailer'

import type {
  AiDraftEmailRequest,
  AiScoreRequest,
  AiScoreResult,
  AiSummarizeRequest,
  AiTextResult,
  IntegrationConnectionDto,
  IntegrationType,
  MessageChannel,
  SendMessageRequest,
  SendMessageResult,
  TestIntegrationResult,
  UpsertIntegrationRequest,
} from '@turbohesap/shared'

import { Activity } from './entities/activity.entity'
import { Contact } from './entities/contact.entity'
import { Opportunity } from './entities/opportunity.entity'
import { IntegrationConnection } from './entities/integration-connection.entity'
import { User } from '../iam/entities/user.entity'
import { displayName } from './user-name.util'
import { runAi, type AiConfig } from './ai/ai-provider'

const MASK = '••••'

// Which config keys are secret per integration type (masked on read).
const SECRET_KEYS: Record<IntegrationType, string[]> = {
  email: ['pass'],
  telegram: ['botToken'],
  whatsapp: ['token'],
  sms: ['password', 'apiKey'],
  ai: ['apiKey'],
}

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(IntegrationConnection)
    private readonly connections: Repository<IntegrationConnection>,
    @InjectRepository(Activity) private readonly activities: Repository<Activity>,
    @InjectRepository(Opportunity) private readonly opportunities: Repository<Opportunity>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(): Promise<IntegrationConnectionDto[]> {
    const rows = await this.connections.find({ order: { type: 'ASC' } })
    return rows.map(toDto)
  }

  async get(type: IntegrationType): Promise<IntegrationConnectionDto | null> {
    const row = await this.connections.findOne({ where: { type } })
    return row ? toDto(row) : null
  }

  async upsert(dto: UpsertIntegrationRequest): Promise<IntegrationConnectionDto> {
    let row = await this.connections.findOne({ where: { type: dto.type } })
    if (!row) row = this.connections.create({ type: dto.type, name: dto.type, config: {} })
    if (dto.name !== undefined) row.name = dto.name
    if (dto.isActive !== undefined) row.isActive = dto.isActive
    // Merge config; keep existing secret if the incoming value is the mask/empty.
    const secrets = SECRET_KEYS[dto.type]
    const merged = { ...row.config }
    for (const [k, v] of Object.entries(dto.config ?? {})) {
      if (secrets.includes(k) && (v === MASK || v === '')) continue
      merged[k] = v
    }
    row.config = merged
    await this.connections.save(row)
    return toDto(row)
  }

  async remove(type: IntegrationType): Promise<void> {
    const row = await this.connections.findOne({ where: { type } })
    if (row) await this.connections.remove(row)
  }

  async test(type: IntegrationType): Promise<TestIntegrationResult> {
    const cfg = await this.configFor(type)
    if (!cfg) return { ok: false, message: 'Yapılandırma bulunamadı' }
    try {
      switch (type) {
        case 'email': {
          const t = this.mailer(cfg)
          await t.verify()
          return { ok: true, message: 'SMTP bağlantısı doğrulandı' }
        }
        case 'telegram': {
          const r = await fetch(`https://api.telegram.org/bot${cfg.botToken}/getMe`)
          const j = (await r.json()) as { ok: boolean }
          return { ok: !!j.ok, message: j.ok ? 'Telegram botu erişilebilir' : 'Geçersiz bot token' }
        }
        case 'ai': {
          const out = await runAi(cfg as AiConfig, 'Yalnızca "OK" yaz.', 16)
          return { ok: !!out, message: out ? 'AI sağlayıcı erişilebilir' : 'AI yanıtı alınamadı' }
        }
        default:
          return { ok: true, message: 'Yapılandırma kaydedildi (uçtan uca test bu kanal için yok)' }
      }
    } catch (e) {
      return { ok: false, message: (e as Error).message }
    }
  }

  // ── Outbound messaging ──
  async send(dto: SendMessageRequest, actor: string | null): Promise<SendMessageResult> {
    const cfg = await this.configFor(dto.channel as IntegrationType)
    if (!cfg) throw new BadRequestException(`${dto.channel} entegrasyonu yapılandırılmamış`)
    let result: SendMessageResult
    switch (dto.channel) {
      case 'email':
        result = await this.sendEmail(cfg, dto)
        break
      case 'telegram':
        result = await this.sendTelegram(cfg, dto)
        break
      case 'whatsapp':
        result = await this.sendWhatsapp(cfg, dto)
        break
      case 'sms':
        result = await this.sendSms(cfg, dto)
        break
      default:
        throw new BadRequestException('Geçersiz kanal')
    }
    if (result.ok && (dto.contactId || dto.opportunityId)) {
      await this.logActivity(dto, actor)
    }
    return result
  }

  private async sendEmail(cfg: Cfg, dto: SendMessageRequest): Promise<SendMessageResult> {
    const t = this.mailer(cfg)
    const info = await t.sendMail({
      from: cfg.from || cfg.user,
      to: dto.to,
      subject: dto.subject || '(konu yok)',
      text: dto.body,
    })
    return { ok: true, message: 'E-posta gönderildi', providerMessageId: info.messageId }
  }

  private async sendTelegram(cfg: Cfg, dto: SendMessageRequest): Promise<SendMessageResult> {
    const r = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: dto.to, text: dto.body }),
    })
    const j = (await r.json()) as { ok: boolean; result?: { message_id: number }; description?: string }
    return j.ok
      ? { ok: true, message: 'Telegram mesajı gönderildi', providerMessageId: String(j.result?.message_id) }
      : { ok: false, message: j.description || 'Telegram gönderimi başarısız' }
  }

  private async sendWhatsapp(cfg: Cfg, dto: SendMessageRequest): Promise<SendMessageResult> {
    const r = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: dto.to,
        type: 'text',
        text: { body: dto.body },
      }),
    })
    const j = (await r.json()) as { messages?: { id: string }[]; error?: { message: string } }
    return j.messages?.length
      ? { ok: true, message: 'WhatsApp mesajı gönderildi', providerMessageId: j.messages[0].id }
      : { ok: false, message: j.error?.message || 'WhatsApp gönderimi başarısız' }
  }

  // Netgsm-compatible SMS (config: usercode, password, header). Generic enough
  // for Turkish providers exposing the same GET API.
  private async sendSms(cfg: Cfg, dto: SendMessageRequest): Promise<SendMessageResult> {
    const url = new URL(cfg.url || 'https://api.netgsm.com.tr/sms/send/get')
    url.searchParams.set('usercode', cfg.usercode || '')
    url.searchParams.set('password', cfg.password || '')
    url.searchParams.set('gsmno', dto.to)
    url.searchParams.set('message', dto.body)
    if (cfg.header) url.searchParams.set('msgheader', cfg.header)
    const r = await fetch(url, { method: 'GET' })
    const text = await r.text()
    const ok = /^00|^01|^02/.test(text.trim())
    return { ok, message: ok ? 'SMS gönderildi' : `SMS yanıtı: ${text}` }
  }

  private async logActivity(dto: SendMessageRequest, actor: string | null): Promise<void> {
    const channelLabels: Record<string, string> = {
      email: 'E-posta',
      telegram: 'Telegram',
      whatsapp: 'WhatsApp',
      sms: 'SMS',
    }
    const label = channelLabels[dto.channel] ?? dto.channel
    await this.activities.save(
      this.activities.create({
        contactId: dto.contactId ?? null,
        opportunityId: dto.opportunityId ?? null,
        activityType: dto.channel === 'email' ? 'email' : 'note',
        subject: dto.subject?.trim() || `${label} mesajı gönderildi`,
        description: dto.body,
        status: 'completed',
        completedAt: new Date(),
        ownerId: actor,
        mentions: [],
      }),
    )
  }

  // ── AI (pluggable providers) ──
  private async runAiSafe(prompt: string, maxTokens: number): Promise<string> {
    const cfg = await this.aiConfig()
    try {
      return await runAi(cfg, prompt, maxTokens)
    } catch (e) {
      throw new BadRequestException((e as Error).message)
    }
  }

  async aiDraftEmail(dto: AiDraftEmailRequest, actor: string | null): Promise<AiTextResult> {
    const tone = dto.tone ?? 'friendly'
    const sender = actor ? await this.users.findOne({ where: { id: actor } }) : null
    const senderName = sender ? displayName(sender) : ''
    const company = sender?.branches?.[0]?.name ?? ''
    const contact = dto.contactId
      ? await this.contacts.findOne({ where: { id: dto.contactId } })
      : null
    const recipient = contact?.name ?? ''

    const facts = [
      senderName ? `Gönderen (imza) adı: ${senderName}` : '',
      company ? `Gönderenin şirketi: ${company}` : '',
      recipient ? `Alıcı: ${recipient}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const prompt = [
      `Bir satış temsilcisi için Türkçe, kişiselleştirilmiş bir mesaj taslağı yaz. Ton: ${tone}.`,
      facts ? `Bilgiler:\n${facts}` : '',
      `Bağlam: ${dto.prompt}`,
      `ÇOK ÖNEMLİ KURALLAR:`,
      `- Köşeli parantezli yer tutucu ASLA kullanma ([Adınız], [Şirket Adı], [İsim] gibi şeyler YASAK).`,
      `- İmzayı yukarıdaki "Gönderen adı" ve varsa "şirket" ile gerçek değerlerle doldur.`,
      `- Alıcıya, biliniyorsa adıyla hitap et.`,
      `- Bir bilgi verilmemişse o ifadeyi tamamen çıkar; yer tutucu/placeholder bırakma.`,
      `- Sadece nihai mesaj gövdesini döndür. Düşünce/akıl yürütme, "Söz konusu mesaj…", "Düzenleme:", "İmza:" gibi meta açıklama veya "Konu:" ekleme. Yalnızca alıcının okuyacağı metni yaz.`,
    ]
      .filter(Boolean)
      .join('\n\n')
    return { text: await this.runAiSafe(prompt, 1500) }
  }

  async aiSummarize(dto: AiSummarizeRequest): Promise<AiTextResult> {
    let text = dto.text ?? ''
    if (dto.opportunityId) {
      const acts = await this.activities.find({
        where: { opportunityId: dto.opportunityId },
        order: { createdAt: 'DESC' },
        take: 50,
      })
      text = acts.map((a) => `- ${a.subject}: ${a.description ?? ''}`).join('\n') || 'Etkinlik yok.'
    }
    const prompt = `Aşağıdaki CRM etkinliklerini Türkçe, kısa ve maddeler hâlinde özetle:\n${text}`
    return { text: await this.runAiSafe(prompt, 600) }
  }

  async aiScore(dto: AiScoreRequest): Promise<AiScoreResult> {
    const o = await this.opportunities.findOne({ where: { id: dto.opportunityId } })
    if (!o) throw new NotFoundException('Fırsat bulunamadı')
    const acts = await this.activities.find({
      where: { opportunityId: o.id },
      order: { createdAt: 'DESC' },
      take: 30,
    })
    const ctx = `Fırsat: ${o.name}; tutar: ${o.amount} ${o.currencyCode}; olasılık: %${o.probability}; aşama: ${o.stage}. Etkinlikler:\n${acts.map((a) => `- ${a.subject}`).join('\n') || 'yok'}`
    const prompt = `${ctx}\n\nBu satış fırsatını değerlendir. SADECE şu JSON formatında yanıt ver: {"score": <0-100 tam sayı>, "rationale": "<kısa Türkçe gerekçe>", "nextAction": "<önerilen sonraki adım>"}`
    const raw = await this.runAiSafe(prompt, 400)
    try {
      const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
      return {
        score: Math.max(0, Math.min(100, Number(j.score) || 0)),
        rationale: String(j.rationale ?? ''),
        nextAction: String(j.nextAction ?? ''),
      }
    } catch {
      return { score: 0, rationale: raw, nextAction: '' }
    }
  }

  // ── helpers ──
  private async configFor(type: IntegrationType): Promise<Cfg | null> {
    const row = await this.connections.findOne({ where: { type } })
    if (!row || !row.isActive) return null
    return row.config as Cfg
  }

  private async aiConfig(): Promise<AiConfig> {
    const row = await this.connections.findOne({ where: { type: 'ai' } })
    return (row?.config ?? {}) as AiConfig
  }

  private mailer(cfg: Cfg): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: cfg.host,
      port: Number(cfg.port || 587),
      secure: cfg.secure === 'true',
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    })
  }
}

type Cfg = Record<string, string>

function toDto(row: IntegrationConnection): IntegrationConnectionDto {
  const secrets = SECRET_KEYS[row.type] ?? []
  const config: Record<string, string> = {}
  const secretKeys: string[] = []
  for (const [k, v] of Object.entries(row.config ?? {})) {
    if (secrets.includes(k)) {
      if (v) secretKeys.push(k)
      config[k] = v ? MASK : ''
    } else {
      config[k] = v
    }
  }
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    isActive: row.isActive,
    config,
    secretKeys,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
