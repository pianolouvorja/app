export default {
  settings: {
    title: 'Configurações',
    sectionTitle: {
      appearance: 'Configurações de Aparência',
      general: 'Configurações Gerais',
      media: 'Mídia & Player',
      projection: 'Projeção & Telas',
    },
    tabs: {
      appearance: 'Aparência',
      general: 'Geral',
      media: 'Mídia & Player',
      projection: 'Projeção & Telas',
    },
    appearance: {
      experienceTitle: 'Experiência Visual',
      experienceSubtitle: 'Sinta a atmosfera do Louvor JA se transformar',
      systemTheme: 'Tema do Sistema',
      lightMode: 'Modo Claro',
      darkMode: 'Modo Escuro',
      glassIntensity: 'Intensidade do Vidro',
      glassSoft: 'Suave',
      glassDeep: 'Profundo',
      autoBrightness: 'Auto-brilho',
      accentColor: 'Acento de Cor',
      interactions: 'Interações',
      interactionsHint: 'Fluidez nas transições de cena.',
      interactionDynamic: 'Dinâmico',
      interactionSoft: 'Suave',
      interactionMist: 'Névoa',
      preview: 'Pré-visualização',
      previewHint:
        'Este é um exemplo de como sua interface será exibida em apresentações.',
      tipTitle: 'Dica de Performance',
      tipDark:
        'O Modo Escuro reduz o consumo de energia em monitores OLED e diminui a fadiga ocular em ambientes de culto.',
      tipLight:
        'O Modo Claro oferece melhor legibilidade em ambientes muito iluminados durante cultos diurnos.',
    },
    placeholder: {
      general: 'Preferências gerais do aplicativo em breve.',
      media: 'Configurações de áudio, vídeo e player em breve.',
      projection: 'Configurações de projeção e telas em breve.',
    },
    projection: {
      monitors: {
        title: 'Arranjo de Monitores',
        identify: 'Identificar Monitores',
        primary: 'Principal',
        extended: 'Estendido',
        empty: 'Nenhum monitor detectado.',
        hint: 'Arraste os monitores para reorganizar a posição física.',
        resetLayout: 'Redefinir arranjo',
      },
      slides: {
        title: 'Slides de Músicas',
        multiScreens: 'Múltiplas Telas',
        projectOn: 'Projetar nas seguintes telas:',
        noExtended:
          'Nenhum monitor estendido (secundário) detectado no sistema.',
      },
      mainScreen: {
        title: 'Tela Principal',
        openFullscreen: 'Abrir música em tela cheia na tela principal',
        disablePrimaryWhenExtended:
          'Desativar tela principal caso haja monitor estendido',
        autoMinimizePlayer: 'Minimizar o player automaticamente',
      },
      lyrics: {
        title: 'Personalização da Letra',
        align: 'Alinhamento da letra',
        alignTop: 'Cima',
        alignCenter: 'Centro',
        alignBottom: 'Baixo',
        showTitle: 'Exibir título da música no primeiro slide',
        customTextFormat: 'Formatação de texto personalizada',
        customBackground: 'Fundo personalizado',
        fontSize: 'Tamanho do texto',
        fontColor: 'Cor do texto',
        fontWeight: 'Peso da fonte',
        weight400: 'Normal',
        weight600: 'Semi',
        weight700: 'Negrito',
        weight900: 'Extra',
        backgroundColor: 'Cor de fundo',
        backgroundImage: 'Imagem de fundo',
        selectImage: 'Clique para selecionar uma imagem',
        removeImage: 'Remover imagem',
        changeImage: 'Trocar imagem',
      },
      errors: {
        loadDisplays: 'Não foi possível carregar os monitores.',
        identify: 'Não foi possível identificar os monitores.',
        identifyDesktopOnly:
          'Identificação de monitores disponível apenas no aplicativo desktop.',
        backgroundImage: 'Não foi possível carregar a imagem de fundo.',
      },
    },
    general: {
      dataTitle: 'Dados locais',
      dataHint:
        'Remove o catálogo, mídias baixadas e preferências salvas na pasta {product}. O app reinicia o setup na próxima abertura.',
      clearData: 'Apagar todos os dados',
      clearError: 'Não foi possível limpar os dados. Tente novamente.',
      desktopOnly: 'Disponível apenas no aplicativo desktop.',
      libraryTitle: 'Biblioteca Local',
      libraryHint:
        'Baixe coletâneas e hinários para reproduzir músicas sem conexão.',
      libraryOpen: 'Abrir Biblioteca Local',
    },
  },
}
