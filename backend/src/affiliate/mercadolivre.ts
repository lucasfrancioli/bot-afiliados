/**
 * Confirmado com um link real gerado no painel de afiliados do usuário
 * (mercadolivre.com.br/afiliados): o rastreio usa dois parâmetros de query,
 * matt_word (identifica o afiliado) e matt_tool (identifica o link/ferramenta),
 * anexados a qualquer URL de produto — não existe chamada de API por link.
 */
export function toAffiliateLink(
  permalink: string,
  mattWord: string | undefined,
  mattTool: string | undefined
): string {
  if (!mattWord || !mattTool) {
    return permalink;
  }
  const url = new URL(permalink);
  url.searchParams.set("matt_word", mattWord);
  url.searchParams.set("matt_tool", mattTool);
  return url.toString();
}
