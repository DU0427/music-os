import QRCode from 'qrcode';
import type {
  ProviderAccount,
  ProviderQrLoginSession,
  ProviderQrPollResult,
  ProviderQrStatus,
} from '../../../src/shared/music/providers';
import { ProviderError } from '../errors';
import { clearNeteaseSession, neteaseRequest, neteaseWebApi } from './http';

const QR_LOGIN_PAGE = 'https://music.163.com/login?codekey=';

/** 网易云二维码状态码：800 过期 / 801 等待扫码 / 802 已扫码待确认 / 803 授权成功 */
const QR_STATUS_BY_CODE: Record<number, ProviderQrStatus> = {
  800: 'expired',
  801: 'waiting',
  802: 'scanned',
  803: 'confirmed',
};

interface QrKeyResponse {
  code: number;
  unikey?: string;
}

interface QrPollResponse {
  code: number;
  message?: string;
}

interface AccountResponse {
  code: number;
  profile?: {
    nickname?: string;
    avatarUrl?: string;
    userId?: number;
  };
}

/** 生成登录二维码（返回 data URL，渲染进程直接展示）。 */
export async function createQrLogin(): Promise<ProviderQrLoginSession> {
  // 走 weapi（官方网页 surface）：明文 /api 二维码接口会被服务端判为旧客户端并返回 8821
  const data = await neteaseWebApi<QrKeyResponse>('/weapi/login/qrcode/unikey', { type: 1 });
  if (data.code !== 200 || !data.unikey) {
    throw new ProviderError('netease', 'UNAVAILABLE', '无法获取网易云登录二维码，请稍后重试。', true, 5_000);
  }
  const qrDataUrl = await QRCode.toDataURL(`${QR_LOGIN_PAGE}${data.unikey}`, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  return { key: data.unikey, qrDataUrl };
}

/** 轮询扫码状态；授权成功后会话内已带上 Cookie。 */
export async function pollQrLogin(key: string): Promise<ProviderQrPollResult> {
  const data = await neteaseWebApi<QrPollResponse>('/weapi/login/qrcode/client/login', { key, type: 1 });
  const status = QR_STATUS_BY_CODE[data.code];
  if (!status) {
    // 便于定位「登录状态异常」：记录非常规返回码与完整字段（不含凭据），例如安全验证要求
    console.warn(
      `[netease-qr] unexpected poll code=${String(data.code)} message=${String(data.message ?? '')} raw=${JSON.stringify(data).slice(0, 240)}`,
    );
    return { status: 'error', account: null };
  }
  if (status === 'confirmed') {
    const account = await fetchAccount();
    return { status, account };
  }
  return { status, account: null };
}

/** 读取当前登录账号；未登录返回 null。 */
export async function fetchAccount(): Promise<ProviderAccount | null> {
  try {
    const data = await neteaseRequest<AccountResponse>('/api/nuser/account/get');
    if (data.code !== 200 || !data.profile) {
      return null;
    }
    return {
      nickname: data.profile.nickname ?? '网易云用户',
      avatarUrl: data.profile.avatarUrl ?? null,
      userId: data.profile.userId ? String(data.profile.userId) : null,
    };
  } catch {
    return null;
  }
}

export async function logoutNetease(): Promise<void> {
  await clearNeteaseSession();
}
