import GlobalConfig from '@/app/app.config.js'

export function EmptyScreenBookmarks() {
  const TextDirection = process.env.TEXT_DIRECTION
  // Language and Translation
  var TranslationData = require(`@/translation/${GlobalConfig.LANG}.json`);

  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold" dir={TextDirection}>  
          {TranslationData["No bookmarks yet!"]}
        </h1>
        <p className="leading-normal text-muted-foreground" dir={TextDirection}>
          {TranslationData["You can start by bookmarking some question-answers."]}
        </p>
      </div>
    </div>
  )
}
