const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;

class NovelScraper {
    constructor() {
        this.baseUrl = 'https://centralnovel.com/the-beginning-after-the-end-capitulo-';
        this.startChapter = 0;
        this.endChapter = 529;
    }

    getStyle() {
        return `
            * { box-sizing: border-box; }
            html { font-size: 16px; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
            body { background-color: #222222; color: white; margin: 0; padding: 24px; font-family: Georgia, "Times New Roman", serif; line-height: 1.8; overflow-wrap: anywhere; }
            .entry-title { text-align: center !important; font-family: "Segoe UI", Tahoma, sans-serif; font-size: clamp(1.5rem, 4vw, 2.25rem); line-height: 1.25; margin: 20px auto 28px; }
            h1, h1.entry-title, h2 { text-align: center !important; max-width: 900px; margin: 20px auto; line-height: 1.3; }
            p { max-width: 900px; margin: 0 auto 1em; font-size: clamp(1rem, 1.7vw, 1.15rem); }
            img, video, iframe { max-width: 100%; height: auto; }
            .chapter-buttons { display: flex; justify-content: center; align-items: stretch; gap: 10px; max-width: 900px; margin: 32px auto 10px; flex-wrap: wrap; }
            .chapter-button { display: flex; justify-content: center; align-items: center; width: min(180px, 100%); min-height: 48px; padding: 10px 14px; text-align: center; border-radius: 5px; color: white; font-weight: bold; background: transparent; border: 1px solid #91C9FF; outline: none; text-decoration: none; }
            @media (max-width: 600px) {
              body { padding: 14px; }
              .entry-title { margin-top: 10px; margin-bottom: 22px; }
              p { font-size: 1rem; line-height: 1.75; text-align: left !important; }
              h2 { font-size: 1.35rem; }
              .chapter-buttons { flex-direction: column; gap: 8px; }
              .chapter-button { width: 100%; }
            }
        `;
    }

    getNavigationButtons() {
        return `
   <div class="chapter-buttons">
                <a id="previous-chapter-button" class="chapter-button">Capítulo Anterior</a>
                <a href="../index.html" class="chapter-button">Home</a>
                <a id="next-chapter-button" class="chapter-button">Próximo Capítulo</a>
             </div> 
    `;
    }

    getScript() {
        return `
      <script>
        window.onload = function() {
          var currentChapter = window.location.pathname.split('/').pop();
          var chapterNumber = parseInt(currentChapter.replace('', '').replace('.html', ''));

          if (chapterNumber > ${this.startChapter}) {
            var previousChapterNumber = chapterNumber - 1;
            var previousChapterFileName = '' + previousChapterNumber + '.html';
            document.getElementById('previous-chapter-button').href = previousChapterFileName;
          } else {
            document.getElementById('previous-chapter-button').style.display = 'none';
          }

          if (chapterNumber < ${this.endChapter}) {
            var nextChapterNumber = chapterNumber + 1;
            var nextChapterFileName = '' + nextChapterNumber + '.html';
            document.getElementById('next-chapter-button').href = nextChapterFileName;
          } else {
            document.getElementById('next-chapter-button').style.display = 'none';
          }
          
          // Marcar capítulo como lido
          var readChapters = JSON.parse(localStorage.getItem('tbate-read-chapters') || '[]');
          if (!readChapters.includes(chapterNumber)) {
            readChapters.push(chapterNumber);
            localStorage.setItem('tbate-read-chapters', JSON.stringify(readChapters));
          }
        };
      </script>
    `;
    }

    async scrapeChapter(chapterNumber) {
        try {
            const url = `${this.baseUrl}${chapterNumber}/`;
            console.log(`🔍 Fazendo scraping do capítulo ${chapterNumber}...`);

            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            const title = $('.entry-title').first().html() || '';
            const date = $('.updated').first().html() || '';
            const chapterName = $('.cat-series').first().html() || '';
            const content = $('.epcontent.entry-content').first().html() || '';

            return { title, date, chapterName, content };
        } catch (error) {
            console.error(`❌ Erro no capítulo ${chapterNumber}:`, error.message);
            return null;
        }
    }

    generateHtml(chapterData) {
        const style1 = this.getStyle();
        const div1 = this.getNavigationButtons();
        const script1 = this.getScript();

        return `<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n  <meta name="theme-color" content="#222222">\n  <title>${chapterData.title}</title>\n  <style>${style1}</style>\n</head>\n<body>`;<div class="entry-title">${chapterData.title}</div><h2 style="text-align: center;">${chapterData.chapterName}</h2><p style="text-align: center;">Lançamento ${chapterData.date}</p>${chapterData.content}${div1}${script1}</body>\n</html>`;
    }

    async saveHtmlFile(content, fileName) {
        try {
            await fs.writeFile(fileName, content, 'utf-8');
            console.log(`✅ Arquivo ${fileName} criado com sucesso!`);
        } catch (error) {
            console.error(`❌ Erro ao salvar ${fileName}:`, error.message);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Gerar arquivo index.html separado
    async generateIndexFile() {
        let chapterLinks = '';

        for (let i = this.startChapter; i <= this.endChapter; i++) {
            chapterLinks += `
            <div class="chapter-item" data-chapter="${i}">
                <a href="chapters/${i}.html" class="chapter-link" data-chapter="${i}">
                    <span class="chapter-number">Capítulo ${i}</span>
                </a>
            </div>`;
        }

        const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Beginning After The End - Índice</title>
    <style>
        body {
            background-color: #1a1a1a;
            color: #ffffff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 0;
            border-bottom: 2px solid #91C9FF;
        }
        
        .title {
            font-size: 2.5em;
            color: #91C9FF;
            margin-bottom: 10px;
            text-shadow: 0 0 10px rgba(145, 201, 255, 0.3);
        }
        
        .stats {
            background: linear-gradient(135deg, #2d2d2d, #3d3d3d);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
            border: 1px solid #91C9FF;
        }
        
        .controls {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 10px 20px;
            background: #91C9FF;
            color: #000;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            background: #7bb8ff;
            transform: translateY(-2px);
        }
        
        .search-box {
            width: 300px;
            padding: 10px 15px;
            background: #2d2d2d;
            border: 2px solid #404040;
            border-radius: 25px;
            color: #ffffff;
            font-size: 16px;
        }
        
        .search-box:focus {
            outline: none;
            border-color: #91C9FF;
        }
        
        .chapter-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 15px;
            margin-top: 30px;
        }
        
        .chapter-item {
            background: linear-gradient(135deg, #2d2d2d, #1f1f1f);
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.3s ease;
            border: 2px solid #404040;
            position: relative;
        }
        
        .chapter-item:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(145, 201, 255, 0.2);
            border-color: #91C9FF;
        }
        
        .chapter-item.read {
            border-color: #4CAF50;
            background: linear-gradient(135deg, #2d4a2d, #1f3f1f);
        }
        
        .chapter-item.read::after {
            content: "✓";
            position: absolute;
            top: 8px;
            right: 12px;
            color: #4CAF50;
            font-size: 18px;
            font-weight: bold;
        }
        
        .chapter-link {
            display: block;
            padding: 20px;
            text-decoration: none;
            color: #ffffff;
            transition: color 0.3s ease;
        }
        
        .chapter-link:hover {
            color: #91C9FF;
        }
        
        .chapter-item.read .chapter-link {
            color: #90EE90;
        }
        
        .chapter-number {
            font-size: 1.1em;
            font-weight: bold;
        }
        
        .hidden {
            display: none !important;
        }
        
        .footer {
            text-align: center;
            margin-top: 50px;
            padding: 30px 0;
            border-top: 1px solid #404040;
            color: #888888;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #2d2d2d;
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            transition: width 0.3s ease;
            border-radius: 10px;
        }
        
        @media (max-width: 768px) {
            .controls {
                flex-direction: column;
                align-items: center;
            }
            
            .search-box {
                width: 100%;
                max-width: 300px;
            }
            
            .chapter-grid {
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">The Beginning After The End</h1>
            <div class="stats">
                <div><strong>Total: ${this.endChapter - this.startChapter + 1} Capítulos</strong></div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div id="progressText">Lidos: 0 de ${this.endChapter - this.startChapter + 1} (0%)</div>
            </div>
        </div>
        
        <div class="controls">
            <input type="text" class="search-box" id="searchBox" placeholder="🔍 Buscar capítulo...">
            <button class="btn" onclick="showAll()">Mostrar Todos</button>
            <button class="btn" onclick="showRead()">Só Lidos</button>
            <button class="btn" onclick="showUnread()">Não Lidos</button>
            <button class="btn" onclick="clearProgress()" style="background: #ff4444;">Limpar Progresso</button>
        </div>
        
        <div class="chapter-grid" id="chapterGrid">
            ${chapterLinks}
        </div>
        
        <div class="footer">
            <p>Clique em um capítulo para ler. O progresso é salvo automaticamente.</p>
        </div>
    </div>

    <script>
        // Gerenciar progresso de leitura
        function getReadChapters() {
            const saved = localStorage.getItem('tbate-read-chapters');
            return saved ? JSON.parse(saved) : [];
        }
        
        function saveReadChapter(chapterNum) {
            let readChapters = getReadChapters();
            if (!readChapters.includes(chapterNum)) {
                readChapters.push(chapterNum);
                localStorage.setItem('tbate-read-chapters', JSON.stringify(readChapters));
            }
            updateProgress();
        }
        
        function markChapterAsRead(chapterNum) {
            const chapterItem = document.querySelector(\`[data-chapter="\${chapterNum}"]\`);
            if (chapterItem) {
                chapterItem.classList.add('read');
                saveReadChapter(chapterNum);
            }
        }
        
        function updateProgress() {
            const readChapters = getReadChapters();
            const total = ${this.endChapter - this.startChapter + 1};
            const readCount = readChapters.length;
            const percentage = Math.round((readCount / total) * 100);
            
            document.getElementById('progressFill').style.width = percentage + '%';
            document.getElementById('progressText').textContent = \`Lidos: \${readCount} de \${total} (\${percentage}%)\`;
        }
        
        function clearProgress() {
            if (confirm('Tem certeza que quer limpar todo o progresso de leitura?')) {
                localStorage.removeItem('tbate-read-chapters');
                document.querySelectorAll('.chapter-item').forEach(item => {
                    item.classList.remove('read');
                });
                updateProgress();
            }
        }
        
        // Filtros
        function showAll() {
            document.querySelectorAll('.chapter-item').forEach(item => {
                item.classList.remove('hidden');
            });
        }
        
        function showRead() {
            document.querySelectorAll('.chapter-item').forEach(item => {
                if (item.classList.contains('read')) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        }
        
        function showUnread() {
            document.querySelectorAll('.chapter-item').forEach(item => {
                if (!item.classList.contains('read')) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        }
        
        // Busca
        document.getElementById('searchBox').addEventListener('input', function(e) {
            const search = e.target.value.toLowerCase();
            document.querySelectorAll('.chapter-item').forEach(item => {
                const chapterText = item.textContent.toLowerCase();
                if (chapterText.includes(search)) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
        
        // Marcar capítulos como lidos ao clicar
        document.querySelectorAll('.chapter-link').forEach(link => {
            link.addEventListener('click', function() {
                const chapterNum = parseInt(this.dataset.chapter);
                markChapterAsRead(chapterNum);
            });
        });
        
        // Inicializar ao carregar a página
        window.addEventListener('load', function() {
            const readChapters = getReadChapters();
            readChapters.forEach(chapterNum => {
                const chapterItem = document.querySelector(\`[data-chapter="\${chapterNum}"]\`);
                if (chapterItem) {
                    chapterItem.classList.add('read');
                }
            });
            updateProgress();
        });
    </script>
</body>
</html>`;

        try {
            await fs.writeFile('./index.html', indexHtml, 'utf-8');
            console.log('✅ Arquivo index.html criado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao criar index.html:', error.message);
        }
    }

    async scrapeAllChapters() {
        console.log(`🚀 Iniciando scraping dos capítulos ${this.startChapter} a ${this.endChapter}...`);

        // Criar diretório se não existir
        try {
            await fs.mkdir('./chapters', { recursive: true });
        } catch (error) {
            // Diretório já existe
        }

        // Gerar arquivo index.html primeiro
        console.log('📄 Gerando arquivo index.html...');
        await this.generateIndexFile();

        for (let i = this.startChapter; i <= this.endChapter; i++) {
            const chapterData = await this.scrapeChapter(i);

            if (chapterData) {
                const htmlContent = this.generateHtml(chapterData);
                const fileName = `./chapters/${i}.html`;
                await this.saveHtmlFile(htmlContent, fileName);
            }

            // Delay para ser gentil com o servidor
            await this.delay(1000);
        }

        console.log('🎉 Scraping concluído!');
        console.log('📋 Abra o arquivo index.html para ver a lista de capítulos!');
    }

    // Fazer scraping de um capítulo específico
    async scrapeSingleChapter(chapterNumber) {
        if (chapterNumber < this.startChapter || chapterNumber > this.endChapter) {
            console.error(`Número do capítulo deve estar entre ${this.startChapter} e ${this.endChapter}`);
            return;
        }

        const chapterData = await this.scrapeChapter(chapterNumber);

        if (chapterData) {
            const htmlContent = this.generateHtml(chapterData);
            const fileName = `./chapters/${chapterNumber}.html`;
            await this.saveHtmlFile(htmlContent, fileName);
        }
    }
}

// Executar o scraper
async function main() {
    const scraper = new NovelScraper();

    // Para gerar apenas o index.html (sem fazer scraping):
    // await scraper.generateIndexFile();

    // Para fazer scraping de todos os capítulos:
    await scraper.scrapeAllChapters();

    // Para um capítulo específico:
    // await scraper.scrapeSingleChapter(400);
}

// Só executar se for chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { NovelScraper };