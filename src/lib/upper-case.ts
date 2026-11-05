/**
 * Padrão da anamnese: tudo em CAIXA ALTA. Os campos de texto do modelo e da
 * anamnese convertem enquanto a pessoa digita (`UpperCaseInput`), o servidor
 * converte títulos ao salvar, e prévia, PDF e "copiar texto" convertem na
 * exportação.
 */
export function toUpper(value: string): string {
  return value.toLocaleUpperCase("pt-BR");
}
