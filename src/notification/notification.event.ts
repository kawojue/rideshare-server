export class CreateEmailNotificationEvent {
    emails: string | string[]
    subject: string
    from?: string
    template: string
    data?: Record<string, any>
    dynamic?: boolean
    attachments: EmailAttachment | EmailAttachment[]

    constructor({
        emails,
        subject,
        template,
        data,
        dynamic,
        attachments,
        from,
    }: {
        emails: string | string[]
        subject: string
        template: string
        data?: Record<string, any>
        dynamic?: boolean
        from?: string
        attachments?: EmailAttachment | EmailAttachment[]
    }) {
        this.emails = Array.isArray(emails) ? emails.map((e) => e.toLowerCase()) : emails.toLowerCase()
        this.template = template
        this.subject = subject
        this.data = data || null
        this.dynamic = dynamic
        this.from = from || 'Rideshare'
        this.attachments = attachments
    }
}

export class CreatePushNotificationEvent {
    userId?: string
    title: string
    body: string

    constructor({ userId, body, title }: PushNotification) {
        this.userId = userId
        this.title = title
        this.body = body
    }
}

export class CreateSmsNotificationEvent {
    message: string
    phone: string | string[]

    constructor({ phone, message }: {
        message: string
        phone: string | string[]
    }) {
        this.message = message
        this.phone = phone
    }
}