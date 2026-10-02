import React from "react";
import { X, Share, PlusSquare, Smartphone, Check } from "lucide-react";

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  onInstallChromium: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  onInstallChromium
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/[0.12] bg-[#0d0e14] p-5 shadow-2xl text-white max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black font-extrabold shadow-sm">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white">iPhoneアプリとして追加</h2>
              <p className="text-[11px] text-zinc-400">PWAホーム画面インストール</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl bg-zinc-900 border border-white/[0.12] text-zinc-300 hover:text-white active:scale-90 transition-all touch-manipulation cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chromium 1-tap install if available */}
        {isInstallable && (
          <div className="mt-3.5 pb-3 border-b border-white/[0.06]">
            <button
              onClick={() => {
                onInstallChromium();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-black py-3 text-xs font-bold shadow-md hover:bg-zinc-200 active:scale-98 whitespace-nowrap"
            >
              <span>ワンタップでインストール</span>
            </button>
          </div>
        )}

        {/* iOS Step-by-Step Guide */}
        <div className="mt-4 space-y-3.5">
          <div className="rounded-xl border border-white/[0.08] bg-[#141620] p-3 text-xs leading-relaxed text-zinc-300">
            iPhoneのSafariブラウザで開いている場合、ホーム画面に追加することで全画面の本格的ネイティブアプリとして動作します。
          </div>

          <div className="space-y-2.5">
            {/* Step 1 */}
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/60 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 font-bold text-xs">
                1
              </div>
              <div className="text-xs">
                <div className="font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                  <span>画面下部の「共有」をタップ</span>
                  <Share className="h-3.5 w-3.5 text-blue-400 inline" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Safariツールバー中央の四角形から上矢印が出ているアイコンを押します。
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/60 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 font-bold text-xs">
                2
              </div>
              <div className="text-xs">
                <div className="font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                  <span>「ホーム画面に追加」を選択</span>
                  <PlusSquare className="h-3.5 w-3.5 text-emerald-400 inline" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  メニューを少し下にスクロールして「ホーム画面に追加」をタップします。
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/60 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 font-bold text-xs">
                3
              </div>
              <div className="text-xs">
                <div className="font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                  <span>右上の「追加」をタップ</span>
                  <Check className="h-3.5 w-3.5 text-blue-400 inline" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  確認画面が表示されるので右上の「追加」を押すと、アプリアイコンがホーム画面に登録されます。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Icon note */}
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3 text-[11px] text-zinc-400 leading-normal">
          <span className="font-bold text-zinc-300 block mb-1">💡 アイコン画像と名称の指定について:</span>
          ホーム画面のアイコン写真はお手元の画像を <code className="text-zinc-200 bg-zinc-900 px-1 py-0.5 rounded">public/apple-touch-icon.png</code> (180×180px) に配置するだけで反映されます。
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-zinc-800 py-3 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors whitespace-nowrap"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
