import PostalMime from 'postal-mime';
import emailService from '../service/email-service';
import accountService from '../service/account-service';
import settingService from '../service/setting-service';
import attService from '../service/att-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { emailConst, isDel, roleConst, settingConst } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import roleService from '../service/role-service';
import verifyUtils from '../utils/verify-utils';
import userService from '../service/user-service';

dayjs.extend(utc);
dayjs.extend(timezone);

function normalizeAddressList(addresses) {
	if (!Array.isArray(addresses)) {
		return [];
	}

	return addresses
		.filter(item => item && typeof item.address === 'string' && item.address.trim() !== '')
		.map(item => ({
			address: item.address.trim(),
			name: typeof item.name === 'string' ? item.name : ''
		}));
}

function extractEmailAddress(headerValue, fallback = '') {
	if (typeof headerValue !== 'string' || headerValue.trim() === '') {
		return fallback;
	}

	const match = headerValue.match(/<([^<>@\s]+@[^<>@\s]+)>/);
	if (match?.[1]) {
		return match[1].trim();
	}

	const directMatch = headerValue.match(/([^\s<>"']+@[^\s<>"']+)/);
	return directMatch?.[1]?.trim() || fallback;
}

function escapeHtml(content) {
	return content
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');
}

function buildFallbackEmail(content, message) {
	const headers = message?.headers;
	const fromHeader = headers?.get?.('from') || '';
	const subject = headers?.get?.('subject') || '';
	const messageId = headers?.get?.('message-id') || '';
	const inReplyTo = headers?.get?.('in-reply-to') || '';
	const references = headers?.get?.('references') || '';
	const fromAddress = extractEmailAddress(fromHeader, typeof message?.from === 'string' ? message.from.trim() : '');
	const fromName = fromHeader.replace(/<[^>]+>/g, '').trim() || emailUtils.getName(fromAddress);
	const bodyParts = content.split(/\r?\n\r?\n/);
	const rawBody = bodyParts.length > 1 ? bodyParts.slice(1).join('\n\n') : '';
	const previewText = rawBody.replace(/\0/g, '').trim().slice(0, 20000);
	const text = previewText || '邮件解析失败，已保存原始邮件预览。';

	return {
		from: {
			address: fromAddress,
			name: fromName
		},
		to: [{ address: message.to, name: emailUtils.getName(message.to) }],
		cc: [],
		bcc: [],
		subject,
		html: `<pre>${escapeHtml(text)}</pre>`,
		text,
		attachments: [],
		inReplyTo,
		references,
		messageId
	};
}

function normalizeAttachmentContent(content) {
	if (content instanceof Uint8Array) {
		return content;
	}

	if (content instanceof ArrayBuffer) {
		return new Uint8Array(content);
	}

	if (ArrayBuffer.isView(content)) {
		return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
	}

	if (typeof content === 'string') {
		return new TextEncoder().encode(content);
	}

	return null;
}

export async function email(message, env, ctx) {

	try {
		const {
			receive,
			tgBotToken,
			tgChatId,
			tgBotStatus,
			forwardStatus,
			forwardEmail,
			ruleEmail,
			ruleType,
			r2Domain,
			noRecipient
		} = await settingService.query({ env });
		const adminEmail = typeof env.admin === 'string' ? env.admin.toLowerCase() : '';

		if (receive === settingConst.receive.CLOSE) {
			return;
		}


		const reader = message.raw.getReader();
		let content = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			content += new TextDecoder().decode(value);
		}

		let email = null;

		try {
			email = await PostalMime.parse(content);
		} catch (parseError) {
			console.error('PostalMime 解析失败，启用原始邮件兜底: ', {
				to: message?.to,
				from: message?.from,
				messageId: message?.headers?.get?.('message-id') || ''
			}, parseError);
			email = buildFallbackEmail(content, message);
		}
		const fromAddress = typeof email?.from?.address === 'string' && email.from.address.trim() !== ''
			? email.from.address.trim()
			: (typeof message.from === 'string' ? message.from.trim() : '');
		const fromName = typeof email?.from?.name === 'string' && email.from.name.trim() !== ''
			? email.from.name.trim()
			: emailUtils.getName(fromAddress);
		const toList = normalizeAddressList(email?.to);
		const ccList = normalizeAddressList(email?.cc);
		const bccList = normalizeAddressList(email?.bcc);
		const recipientList = toList.length > 0 ? toList : [{ address: message.to, name: '' }];

		const account = await accountService.selectByEmailIncludeDel({ env: env }, message.to);
		const accountOwner = account ? await userService.selectById({ env }, account.userId) : null;
		const isAdminAccount = accountOwner && accountOwner.email && accountOwner.email.toLowerCase() === adminEmail;

		if (!account && noRecipient === settingConst.noRecipient.CLOSE) {
			return;
		}

		if (account && !isAdminAccount) {

			let { banEmail, banEmailType, availDomain } = await roleService.selectByUserId({ env: env }, account.userId);

			if(!roleService.hasAvailDomainPerm(availDomain, message.to)) {
				return;
			}

			banEmail = banEmail.split(',').filter(item => item !== '');

			for (const item of banEmail) {

				if (verifyUtils.isDomain(item)) {

					const banDomain = item.toLowerCase();
					const receiveDomain = emailUtils.getDomain(fromAddress.toLowerCase());

					if (banDomain === receiveDomain) {

						if (banEmailType === roleConst.banEmailType.ALL) return;

						if (banEmailType === roleConst.banEmailType.CONTENT) {
							email.html = 'The content has been deleted';
							email.text = 'The content has been deleted';
							email.attachments = [];
						}

					}

				} else {

					if (item.toLowerCase() === fromAddress.toLowerCase()) {

						if (banEmailType === roleConst.banEmailType.ALL) return;

						if (banEmailType === roleConst.banEmailType.CONTENT) {
							email.html = 'The content has been deleted';
							email.text = 'The content has been deleted';
							email.attachments = [];
						}

					}

				}

			}

		}

		const toName = recipientList.find(item => item.address.toLowerCase() === message.to.toLowerCase())?.name || '';

		const params = {
			toEmail: message.to,
			toName: toName,
			sendEmail: fromAddress,
			name: fromName,
			subject: typeof email?.subject === 'string' ? email.subject : '',
			content: typeof email?.html === 'string' ? email.html : '',
			text: typeof email?.text === 'string' ? email.text : '',
			cc: JSON.stringify(ccList),
			bcc: JSON.stringify(bccList),
			recipient: JSON.stringify(recipientList),
			inReplyTo: typeof email?.inReplyTo === 'string' ? email.inReplyTo : '',
			relation: typeof email?.references === 'string' ? email.references : '',
			messageId: typeof email?.messageId === 'string' ? email.messageId : '',
			userId: account ? account.userId : 0,
			accountId: account ? account.accountId : 0,
			isDel: isDel.NORMAL,
			status: emailConst.status.SAVING
		};

		const attachments = [];
		const cidAttachments = [];

		for (let item of Array.isArray(email?.attachments) ? email.attachments : []) {
			try {
				const normalizedContent = normalizeAttachmentContent(item?.content);

				if (!normalizedContent) {
					console.warn('跳过异常附件: 无法识别内容类型', {
						to: message?.to,
						from: fromAddress,
						filename: item?.filename || '',
						contentType: typeof item?.content
					});
					continue;
				}

				let attachment = { ...item };
				attachment.content = normalizedContent;
				attachment.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(normalizedContent) + fileUtils.getExtFileName(item.filename);
				attachment.size = normalizedContent.byteLength;
				attachments.push(attachment);
				if (attachment.contentId) {
					cidAttachments.push(attachment);
				}
			} catch (attachmentError) {
				console.error('附件预处理失败，已跳过该附件: ', {
					to: message?.to,
					from: fromAddress,
					filename: item?.filename || '',
					messageId: message?.headers?.get?.('message-id') || ''
				}, attachmentError);
			}
		}

		let emailRow = await emailService.receive({ env }, params, cidAttachments, r2Domain);

		attachments.forEach(attachment => {
			attachment.emailId = emailRow.emailId;
			attachment.userId = emailRow.userId;
			attachment.accountId = emailRow.accountId;
		});

		if (attachments.length > 0 && env.r2) {
			await attService.addAtt({ env }, attachments);
		}

		emailRow = await emailService.completeReceive({ env }, account ? emailConst.status.RECEIVE : emailConst.status.NOONE, emailRow.emailId);


		if (ruleType === settingConst.ruleType.RULE) {

			const emails = ruleEmail.split(',');

			if (!emails.includes(message.to)) {
				return;
			}

		}


		if (tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {

			const tgMessage = `<b>${params.subject}</b>

<b>发件人：</b>${params.name}		&lt;${params.sendEmail}&gt;
<b>收件人：\u200B</b>${message.to}
<b>时间：</b>${dayjs.utc(emailRow.createTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm')}

${params.text || emailUtils.htmlToText(params.content) || ''}
`;

			const tgChatIds = tgChatId.split(',');

			await Promise.all(tgChatIds.map(async chatId => {
				try {
					const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							chat_id: chatId,
							parse_mode: 'HTML',
							text: tgMessage
						})
					});
					if (!res.ok) {
						console.error(`转发 Telegram 失败: chatId=${chatId}, 状态码=${res.status}`);
					}
				} catch (e) {
					console.error(`转发 Telegram 失败: chatId=${chatId}`, e);
				}
			}));
		}

		if (forwardStatus === settingConst.forwardStatus.OPEN && forwardEmail) {

			const emails = forwardEmail.split(',');

			await Promise.all(emails.map(async email => {

				try {
					await message.forward(email);
				} catch (e) {
					console.error(`转发邮箱 ${email} 失败：`, e);
				}

			}));

		}

	} catch (e) {

		console.error('邮件接收异常: ', {
			to: message?.to,
			from: message?.from,
			messageId: message?.headers?.get?.('message-id') || ''
		}, e);
	}
}
