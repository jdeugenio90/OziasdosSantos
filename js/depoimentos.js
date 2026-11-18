/* ==========================================================================
   DEPOIMENTOS — é só editar este arquivo.

   COMO ADICIONAR UM DEPOIMENTO REAL
   1. Copie o bloco de exemplo abaixo e cole no INÍCIO da lista.
   2. Troque o texto, o nome e o detalhe (cidade, profissão...).
   3. Deixe  real: true.
   4. Salve o arquivo e publique.

        {
          texto: 'Escreva aqui o que a pessoa disse.',
          nome: 'Nome da pessoa',
          detalhe: 'Profissão · Cidade',
          real: true
        },

   COMO OS FICTÍCIOS SAEM SOZINHOS
   O carrossel sempre mostra todos os depoimentos reais. Os de exemplo
   (real: false) só entram para completar o mínimo definido abaixo.
   Com o mínimo em 4:  1 real + 3 exemplos · 2 reais + 2 exemplos ·
   3 reais + 1 exemplo · 4 ou mais reais = nenhum exemplo aparece.
   Não é preciso apagar os exemplos.

   Os exemplos aparecem no site com a etiqueta "Exemplo ilustrativo".
   Peça sempre autorização da pessoa antes de publicar o nome dela.
   ========================================================================== */

window.DEPOIMENTOS_MINIMO = 4;

window.DEPOIMENTOS = [

  // ---- Depoimentos reais: cole os novos logo abaixo desta linha ----


  // ---- Exemplos (saem sozinhos conforme os reais chegam) ----
  {
    texto: 'Saímos de R$ 38 mil em dívidas para R$ 12 mil de reserva em 10 meses. O Desafio mudou a nossa casa.',
    nome: 'Ana & Paulo Ribeiro',
    detalhe: 'Casados · Belo Horizonte',
    real: false
  },
  {
    texto: 'Levei a palestra para a igreja e algumas pessoas se inscreveram no curso depois. O impacto foi imediato e duradouro.',
    nome: 'Pr. Marcos Andrade',
    detalhe: 'Igreja Vida Nova · Campinas',
    real: false
  },
  {
    texto: 'Nunca tinha investido um real. Em três meses já tinha Tesouro e CDB rendendo. Ele explica com paciência e Palavra.',
    nome: 'Juliana Ferreira',
    detalhe: 'Enfermeira · Recife',
    real: false
  },
  {
    texto: 'A palestra na empresa gerou uma revolução silenciosa: em seis meses, 70% da equipe começou a investir pelo menos R$ 100 por mês.',
    nome: 'Ricardo Almeida',
    detalhe: 'Gestor · GR Consultoria',
    real: false
  }
];
