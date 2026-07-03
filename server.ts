import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurações do GitHub vindas das variáveis de ambiente do Render
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // formato: "usuario/repositorio"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE_PATH = process.env.GITHUB_FILE_PATH || 'src/tournament.json';

interface Reward {
  rank: string;
  gems: number;
}

interface TournamentConfig {
  title: string;
  region: string;
  image_url: string;
  map: string;
  allowed_emotes: string[];
  registration_start: string;
  tournament_start: string;
  rewards: Reward[];
}

// Configuração Padrão com os horários corrigidos (Inscrição: 18:00 | Torneio: 19:00)
const defaultTournament: TournamentConfig = {
  title: "y2kzn tour 1v1 bd only punch",
  region: "sa",
  image_url: "https://cdn.discordapp.com/attachments/1522374892690079767/1522403393161920643/Zn_1v1.png",
  map: "level19_block",
  allowed_emotes: ["punch"],
  registration_start: "2026-07-02T18:00", 
  tournament_start: "2026-07-02T19:00",     
  rewards: [
    { rank: "16-9", gems: 100 },
    { rank: "8-5", gems: 200 },
    { rank: "4-3", gems: 500 },
    { rank: "2", gems: 1000 },
    { rank: "1", gems: 10000 }
  ]
};

// Função para buscar o arquivo atual direto do repositório do GitHub
async function getFileFromGitHub() {
  if (!GITHUB_TOKEN || !GITHUB_REPO) return { content: defaultTournament, sha: null };

  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`;
  
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });

    if (response.status === 200) {
      const data = await response.json() as { content: string; sha: string };
      const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');
      return { content: JSON.parse(decodedContent) as TournamentConfig, sha: data.sha };
    }
  } catch (error) {
    console.error("Erro ao buscar dados do GitHub, usando o padrão local:", error);
  }
  return { content: defaultTournament, sha: null };
}

// ----------------------------------------------------
// ROTAS DA API
// ----------------------------------------------------

// Rota utilizada pelo jogo (Stumble Guys) para baixar as configurações
app.get('/api/tournaments', async (req: Request, res: Response) => {
  const githubData = await getFileFromGitHub();
  res.json([githubData.content]);
});

// Rota da Interface Visual do Painel de Controle (Acessível via Navegador)
app.get('/', async (req: Request, res: Response) => {
  const githubData = await getFileFromGitHub();
  const t = githubData.content;
  const rewardsText = t.rewards ? t.rewards.map(r => `${r.rank}=${r.gems}`).join('\n') : '';

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Auto-Deploy - y2kznbone</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #121214; color: #e1e1e6; margin: 0; padding: 20px; display: flex; justify-content: center; }
      .container { width: 100%; max-width: 600px; background: #202024; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
      h1 { color: #00b37e; text-align: center; margin-bottom: 20px; font-size: 24px; }
      label { display: block; margin-top: 15px; margin-bottom: 5px; font-weight: bold; font-size: 14px; }
      input, select, textarea { width: 100%; padding: 10px; background: #121214; border: 1px solid #29292e; border-radius: 4px; color: #fff; box-sizing: border-box; font-size: 14px; }
      input:focus, select:focus, textarea:focus { border-color: #00b37e; outline: none; }
      button { width: 100%; padding: 12px; background: #00b37e; border: none; border-radius: 4px; color: white; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 25px; transition: background 0.2s; }
      button:hover { background: #00875f; }
      .preview-box { margin-top: 20px; text-align: center; border-top: 1px solid #29292e; padding-top: 15px; }
      .preview-img { max-width: 150px; border-radius: 8px; margin-top: 10px; border: 2px solid #00b37e; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Painel de Controle (Auto-Commit GitHub)</h1>
      <form action="/admin/update" method="POST">
        <label>Título do Torneio:</label>
        <input type="text" name="title" value="${t.title}" required>

        <label>Região:</label>
        <select name="region">
          <option value="sa" ${t.region === 'sa' ? 'selected' : ''}>South America (SA)</option>
          <option value="na" ${t.region === 'na' ? 'selected' : ''}>North America (NA)</option>
        </select>

        <label>ID do Mapa:</label>
        <input type="text" name="map" value="${t.map}" required>

        <label>Link da Imagem (URL):</label>
        <input type="text" name="image_url" value="${t.image_url}" required>

        <label>Emotes (separados por vírgula):</label>
        <input type="text" name="allowed_emotes" value="${t.allowed_emotes.join(', ')}">

        <label>Início das Inscrições:</label>
        <input type="datetime-local" name="registration_start" value="${t.registration_start}">

        <label>Início do Torneio:</label>
        <input type="datetime-local" name="tournament_start" value="${t.tournament_start}">

        <label>Gemas (Formato: posicao=gemas | Linha por linha):</label>
        <textarea name="rewards" rows="5">${rewardsText}</textarea>

        <button type="submit">Salvar e Atualizar Repositório</button>
      </form>
      <div class="preview-box">
        <p style="font-size: 12px; color: #8d8d99;">Imagem configurada:</p>
        <img src="${t.image_url}" class="preview-img" alt="Preview">
      </div>
    </div>
  </body>
  </html>
  `;
  res.send(html);
});

// Processamento do formulário e envio do Commit automatizado para o GitHub
app.post('/admin/update', async (req: Request, res: Response) => {
  try {
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return res.status(500).send("Erro: Variáveis de ambiente GITHUB_TOKEN ou GITHUB_REPO ausentes no Render.");
    }

    const { title, region, map, image_url, allowed_emotes, registration_start, tournament_start, rewards } = req.body;

    const emotesArray = allowed_emotes ? (allowed_emotes as string).split(',').map(e => e.trim()) : [];
    const rewardsArray: Reward[] = [];
    
    if (rewards) {
      (rewards as string).split('\n').forEach(line => {
        const [rank, gems] = line.split('=');
        if (rank && gems) rewardsArray.push({ rank: rank.trim(), gems: parseInt(gems.trim(), 10) });
      });
    }

    const updatedTournament: TournamentConfig = {
      title, region, map, image_url,
      allowed_emotes: emotesArray,
      registration_start, tournament_start,
      rewards: rewardsArray
    };

    // Pega o SHA do arquivo atualizado para poder aplicar a sobreposição
    const githubData = await getFileFromGitHub();

    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const newContentBase64 = Buffer.from(JSON.stringify(updatedTournament, null, 2)).toString('base64');

    const bodyData: any = {
      message: "feat: update tournament configs from active live dashboard",
      content: newContentBase64,
      branch: GITHUB_BRANCH
    };

    if (githubData.sha) {
      bodyData.sha = githubData.sha;
    }

    // Executa a requisição PUT enviando as atualizações para a branch do repositório
    const githubResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });

    if (githubResponse.status === 200 || githubResponse.status === 201) {
      res.send('<script>alert("Sucesso! O repositório foi atualizado e o Render disparou o redeploy automático. O jogo sincronizará em instantes."); window.location.href="/";</script>');
    } else {
      const errText = await githubResponse.text();
      res.status(500).send("Erro no commit da API do GitHub: " + errText);
    }

  } catch (err: any) {
    res.status(500).send("Erro fatal interno: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Backbone y2kznbone operacional na porta ${PORT}`);
});

