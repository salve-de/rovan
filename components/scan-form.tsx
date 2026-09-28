"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowIcon } from "@/components/icons";

export function ScanForm({
  compact = false,
  hideExtraToggle = false,
  submitLabel,
  placeholder = "会社名・店舗名 ＋ 地域（例: 青葉ベーカリー 高崎、山田板金 大田区）またはURL",
  label,
}: {
  compact?: boolean;
  hideExtraToggle?: boolean;
  submitLabel?: string;
  placeholder?: string;
  label?: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [extraUrl, setExtraUrl] = useState("");
  const [extraSocial, setExtraSocial] = useState("");
  const [extraProduct, setExtraProduct] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = input.trim();
    if (!value) {
      setError("会社名・店舗名、またはサイトURLを入力してください。");
      return;
    }
    setError("");

    const query = new URLSearchParams();
    query.set("input", value);
    if (extraUrl.trim()) query.set("extraUrl", extraUrl.trim());
    if (extraSocial.trim()) query.set("extraSocial", extraSocial.trim());
    if (extraProduct.trim()) query.set("extraProduct", extraProduct.trim());

    router.push(`/scan?${query.toString()}`);
  }

  // 開いた時の一体型高精度フォーム（全方位対応）
  if (!compact && showExtra) {
    return (
      <div className="scan-form-outer">
        <form className="scan-form-expanded" id="scan" onSubmit={submit} noValidate>
          <div className="expanded-header">
            <div className="expanded-title-row">
              <strong className="expanded-title">公開情報とAI回答の確認（追加情報は任意）</strong>
              <button
                type="button"
                className="expanded-close-btn"
                onClick={() => setShowExtra(false)}
              >
                − 簡易入力に戻す
              </button>
            </div>
            <p className="expanded-sub">会社・店舗・個人事業主など、URLまたは名称だけで確認できます。SNSや参照元URLを追加した場合は、入力された公開情報も確認対象に含めます（空欄のままでも診断できます）。</p>
          </div>

          {/* メイン入力 */}
          <div className="expanded-field-main">
            <label htmlFor="scan-main-input">会社名・店舗名・活動名（地域併記推奨）、またはメインURL <span className="req-tag">必須</span></label>
            <input
              id="scan-main-input"
              aria-label="会社名・店舗名・活動名・URL"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="text"
              placeholder="例: 山田板金 大田区、青葉カフェ 高崎、または https://yamada-bankin.jp"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              autoFocus
            />
          </div>

          {/* 3つの追加オプション入力 */}
          <div className="expanded-options-grid">
            <div className="expanded-field">
              <label htmlFor="extra-social">X（旧Twitter）/ Instagram <span className="opt-tag">任意</span></label>
              <input
                id="extra-social"
                type="text"
                placeholder="@your_account またはURL"
                value={extraSocial}
                onChange={(e) => setExtraSocial(e.target.value)}
              />
            </div>
            <div className="expanded-field">
              <label htmlFor="extra-url">HP / YouTube / note / リンク集 <span className="opt-tag">任意</span></label>
              <input
                id="extra-url"
                type="url"
                placeholder="https://... または Lit.link"
                value={extraUrl}
                onChange={(e) => setExtraUrl(e.target.value)}
              />
            </div>
            <div className="expanded-field">
              <label htmlFor="extra-product">商品名・サービス名・補足情報 <span className="opt-tag">任意</span></label>
              <input
                id="extra-product"
                type="text"
                placeholder="例: 商品名、サービス名、確認したい分野"
                value={extraProduct}
                onChange={(e) => setExtraProduct(e.target.value)}
              />
            </div>
          </div>

          {error ? <p className="form-error" role="alert">{error}</p> : null}

          {/* 一体化した送信フッター：入力欄の直下に配置 */}
          <div className="expanded-footer">
              <span className="expanded-note">※ 無料診断から自動で課金されることはありません</span>
            <button type="submit" className="expanded-submit-btn">
              <span>AI推薦の現状を無料診断</span>
              <ArrowIcon />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="scan-form-outer">
      <form
        className={`scan-form ${compact ? "scan-form-compact" : ""}`}
        id={compact ? undefined : "scan"}
        onSubmit={submit}
        noValidate
      >
        <div className="scan-field">
          <input
            aria-label={label ?? "会社名・店舗名・活動名・URL"}
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="text"
            placeholder={placeholder}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button type="submit">
            <span>{submitLabel ?? (compact ? "無料診断" : "AI推薦の現状を無料診断")}</span>
            <ArrowIcon />
          </button>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}


        {!compact && !hideExtraToggle ? (
          <div className="scan-extra-section">
            <button
              type="button"
              className="scan-extra-toggle"
              onClick={() => setShowExtra(true)}
              aria-expanded={showExtra}
            >
              <span className="toggle-icon">＋</span>
              <span>SNS・参照元URL・商品名を追加する（任意）</span>
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
