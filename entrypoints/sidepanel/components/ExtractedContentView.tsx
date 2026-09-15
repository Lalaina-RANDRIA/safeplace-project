import type { UIExtractedContent } from "../types/ui";

/**
 * Aperçu du contenu analysé (texte + liens). Markup inchangé par rapport à
 * l'affichage historique, isolé pour pouvoir être protégé par un voile.
 */
export default function ExtractedContentView({
  content,
}: {
  content: UIExtractedContent;
}) {
  const hasText = content.text.length > 0;
  const hasLinks = content.links.length > 0;

  if (!hasText && !hasLinks) return null;

  return (
    <div className="space-y-3.5">
      {/* Texte extrait */}
      {hasText && (
        <div className="space-y-1.5">
          <span className="text-[10.5px] font-semibold text-ink">
            Texte extrait{" "}
            <span className="font-normal text-[#5C6661]">
              ({content.characterCount} caractères)
            </span>
          </span>
          <div className="bg-paper border border-hairline rounded-sm p-2.5 max-h-36 overflow-y-auto">
            <p className="text-[11px] text-ink leading-relaxed whitespace-pre-wrap m-0">
              {content.text}
            </p>
          </div>
        </div>
      )}

      {/* Liens extraits */}
      {hasLinks && (
        <div className="space-y-1.5">
          <span className="text-[10.5px] font-semibold text-ink">
            Liens externes{" "}
            <span className="font-normal text-[#5C6661]">
              ({content.links.length})
            </span>
          </span>
          <div className="bg-paper border border-hairline rounded-sm p-2.5 max-h-28 overflow-y-auto space-y-1.5">
            {content.links.map((link, index) => (
              <div key={`${index}-${link.href}`} className="flex flex-col gap-0.5">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-brand-green underline underline-offset-1 truncate"
                  title={link.href}
                >
                  {link.text || link.href}
                </a>
                {link.text && (
                  <span className="text-[10px] text-[#5C6661] truncate">
                    {link.href}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
