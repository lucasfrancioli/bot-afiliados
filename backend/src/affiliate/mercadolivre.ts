/**
 * O programa de afiliados do Mercado Livre gera links anexando um parâmetro
 * de rastreio (nome/valor definidos no painel deles) à URL normal do produto —
 * não existe uma chamada de API por link. Os valores exatos (ML_AFFILIATE_PARAM_NAME/
 * ML_AFFILIATE_PARAM_VALUE) precisam vir de um link de exemplo gerado no seu
 * painel de afiliados (mercadolivre.com.br/afiliados) e ainda não foram confirmados.
 */
export function toAffiliateLink(
  permalink: string,
  paramName: string | undefined,
  paramValue: string | undefined
): string {
  if (!paramName || !paramValue) {
    return permalink;
  }
  const url = new URL(permalink);
  url.searchParams.set(paramName, paramValue);
  return url.toString();
}
