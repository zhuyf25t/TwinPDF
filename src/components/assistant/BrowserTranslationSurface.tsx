type BrowserTranslationSurfaceProps = {
  hasSelection: boolean;
  text: string;
  emptyText: string;
};

export function BrowserTranslationSurface({ hasSelection, text, emptyText }: BrowserTranslationSurfaceProps) {
  return (
    <section className="assistant-box translation-zone">
      <div className="box-title">
        <span>浏览器翻译区</span>
        <small>这里是普通网页文本，可直接被浏览器翻译。</small>
      </div>
      <div className={`translation-surface ${hasSelection ? "" : "empty-state"}`} lang="en" translate="yes">
        <p>{hasSelection ? text : emptyText}</p>
      </div>
    </section>
  );
}
