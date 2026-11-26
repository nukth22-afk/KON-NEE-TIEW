import { signInWithPopup, signOut } from 'firebase/auth';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { verifyAdminSession } from '../lib/api';
import { auth, googleAuthProvider } from '../lib/firebase';
import type { AdminUser, SiteSettings } from '../types/blog';

interface AdminLoginProps {
  settings: SiteSettings;
  onSuccess: (user: AdminUser, token: string) => void;
  onCancel: () => void;
}

export function AdminLogin({ settings, onSuccess, onCancel }: AdminLoginProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      const credential = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await credential.user.getIdToken(true);
      const verifiedUser = await verifyAdminSession(idToken);
      onSuccess(verifiedUser, idToken);
    } catch (err) {
      await signOut(auth).catch(() => {});
      const message =
        err instanceof Error
          ? err.message
          : 'ไม่สามารถเข้าสู่ระบบผู้ดูแลได้ กรุณาลองใหม่อีกครั้ง';
      if (message.includes('popup-closed-by-user')) {
        setError('ยกเลิกการเข้าสู่ระบบด้วย Google');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col justify-center items-center px-5 py-12">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#4B524B] hover:text-[#252525] mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับสู่หน้าเว็บไซต์ {settings.site_name || 'ฅนหนีเที่ยว'}</span>
        </button>

        <div className="bg-white rounded-2xl border border-[#E5E2DA] shadow-[0_12px_40px_rgba(37,37,37,0.06)] p-8 sm:p-10">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#DDE8DD] text-[#244B3A] flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" strokeWidth={1.7} />
            </div>

            <p className="text-xs font-medium tracking-[0.18em] text-[#244B3A] mb-1.5 uppercase">
              ADMIN CMS · {settings.site_name_en || 'KON NEE TIEW'}
            </p>
            <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#252525]">
              ระบบจัดการเนื้อหา {settings.site_name || 'ฅนหนีเที่ยว'}
            </h1>
            <p className="mt-2.5 text-sm text-[#5C615C] leading-relaxed">
              เข้าสู่ระบบด้วยบัญชี Google ของผู้ดูแลเว็บไซต์ เพื่อจัดการบทความ คลังรูปภาพ และตั้งค่าหน้าแรก
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 px-4 py-3 rounded-xl bg-[#FEF4F8] border border-[#F3C5D8] text-sm text-[#B82860]"
            >
              {error}
            </div>
          )}

          <div className="mt-7">
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleSignIn}
              className="w-full py-3.5 px-5 rounded-full bg-[#244B3A] hover:bg-[#1B3A2C] disabled:opacity-60 text-[#FAFAF7] text-sm font-medium transition-colors cursor-pointer inline-flex items-center justify-center gap-3 shadow-xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.24-.94 2.3-2 3.01v2.5h3.24c1.9-1.75 2.99-4.32 2.99-7.38 0-.38-.04-.75-.1-1.11z"
                />
                <path
                  fill="currentColor"
                  opacity="0.88"
                  d="M12.17 21c2.7 0 4.97-.9 6.62-2.41l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H3.23v2.58C4.88 18.8 8.27 21 12.17 21z"
                />
                <path
                  fill="currentColor"
                  opacity="0.72"
                  d="M6.58 12.94a5.7 5.7 0 0 1 0-3.88V6.48H3.23a9.5 9.5 0 0 0 0 8.54l3.35-2.08z"
                />
                <path
                  fill="currentColor"
                  opacity="0.92"
                  d="M12.17 6.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87C17.13 3.96 14.87 3 12.17 3 8.27 3 4.88 5.2 3.23 8.48l3.35 2.58c.79-2.36 2.99-4.11 5.59-4.11z"
                />
              </svg>
              <span>
                {submitting
                  ? 'กำลังตรวจสอบสิทธิ์ผู้ดูแล...'
                  : 'เข้าสู่ระบบด้วยบัญชี Google'}
              </span>
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[#7D827D] leading-relaxed">
            ระบบจะตรวจสอบสิทธิ์ผู้ดูแลเว็บไซต์จากฐานข้อมูลโดยอัตโนมัติ เฉพาะบัญชีที่ได้รับสิทธิ์เท่านั้นจึงจะสามารถแก้ไขเนื้อหาได้
          </p>
        </div>
      </div>
    </div>
  );
}
