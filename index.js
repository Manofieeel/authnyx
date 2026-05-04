const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// // Configuração do Discord - USANDO VARIÁVEIS DE AMBIENTE APENAS
const DISCORD_CONFIG = {
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    REDIRECT_URI: process.env.REDIRECT_URI || `http://localhost:3000/auth/callback`,
    BOT_TOKEN: process.env.BOT_TOKEN,  // ← SEM VALOR FIXO!
};

const DISCORD_API = 'https://discord.com/api/v10';

const botClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const CONFIG = {
    GUILD_ID: process.env.GUILD_ID || '1490520923474890864',
    AUTH_CHANNEL_ID: process.env.AUTH_CHANNEL_ID || '1500581108843020428',
    VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID || '1490537105758228540'
};

// ENDPOINT DE HEALTH CHECK PARA O CRON-JOB (MANTÉM O BOT ACORDADO)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        botStatus: botClient.isReady() ? 'online' : 'offline'
    });
});

// ROTA RAIZ PARA VERIFICAR SE O SERVIDOR ESTÁ RODANDO
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    font-family: 'Segoe UI', Arial;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                }
                .container {
                    text-align: center;
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    animation: fadeIn 1s;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                h1 { color: #9B59B6; }
                .status { color: #27ae60; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="check">🤖</div>
                <h1>NyxAuth Bot</h1>
                <p>Status: <span class="status">✅ Online</span></p>
                <p>Servidor de autenticação rodando perfeitamente!</p>
                <p><small>O bot está ativo e funcionando no Discord.</small></p>
            </div>
        </body>
        </html>
    `);
});

botClient.once('ready', async () => {
    console.log(`✅ NyxAuth Bot online como ${botClient.user.tag}`);
    botClient.user.setActivity('🔐 Autorize clicando no botão', { type: 'WATCHING' });
    await setupVerificationMessage();
});

async function setupVerificationMessage() {
    const channel = botClient.channels.cache.get(CONFIG.AUTH_CHANNEL_ID);
    if (!channel) {
        console.error(`❌ Canal ${CONFIG.AUTH_CHANNEL_ID} não encontrado!`);
        return;
    }

    // Apaga mensagens antigas do bot para evitar duplicatas
    const messages = await channel.messages.fetch({ limit: 10 });
    const oldMessages = messages.filter(m => m.author.id === botClient.user.id);
    for (const msg of oldMessages.values()) {
        await msg.delete().catch(() => {});
    }

    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_CONFIG.REDIRECT_URI)}&response_type=code&scope=identify%20guilds.join`;

    const embed = new EmbedBuilder()
        .setTitle('🔐 NyxAuth - Verificação de Identidade')
        .setDescription(
            '### Para acessar todos os canais, você precisa autorizar o NyxAuth.\n\n' +
            '**📋 Como verificar:**\n' +
            '• Clique no botão **Autorizar NyxAuth** abaixo\n' +
            '• Uma janela do Discord vai abrir **automaticamente**\n' +
            '• Clique em **Autorizar**\n' +
            '• Pronto! Você será verificado na hora\n\n' +
            '⚠️ **Sem autorização, o acesso não será liberado.**\n\n' +
            '`Seus dados estão seguros. Apenas verificamos sua identidade.`'
        )
        .setColor('#4F4F4F')
        .setFooter({ text: 'NyxAuth • Clique no botão abaixo' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('Autorizar NyxAuth')
                .setStyle(ButtonStyle.Link)
                .setURL(authUrl)
                .setEmoji('🔒')
        );

    await channel.send({ embeds: [embed], components: [row] });
    console.log('✅ Mensagem com botão Link enviada!');
    console.log(`🔗 URL de autenticação: ${authUrl}`);
}

// Callback do OAuth2
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.send('Erro: Código não recebido.');
    }
    
    try {
        const tokenResponse = await axios.post(`${DISCORD_API}/oauth2/token`,
            new URLSearchParams({
                client_id: DISCORD_CONFIG.CLIENT_ID,
                client_secret: DISCORD_CONFIG.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: DISCORD_CONFIG.REDIRECT_URI
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        
        const { access_token } = tokenResponse.data;
        
        const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        
        const userData = userResponse.data;
        
        await addRoleToUser(userData.id);
        
        res.send(`
            <html>
            <head>
                <style>
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        font-family: 'Segoe UI', Arial;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        margin: 0;
                    }
                    .container {
                        text-align: center;
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        animation: fadeIn 1s;
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    h1 { color: #9B59B6; }
                    .check { font-size: 70px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="check">✅</div>
                    <h1>NyxAuth - Verificado!</h1>
                    <p><strong>${userData.username}</strong>, você foi verificado com sucesso!</p>
                    <p>✓ Acesso liberado no servidor</p>
                    <p>Pode fechar esta janela.</p>
                </div>
                <script>setTimeout(() => window.close(), 3000);</script>
            </body>
            </html>
        `);
        
        console.log(`✅ ${userData.username} (${userData.id}) verificado via OAuth2`);
        
    } catch (error) {
        console.error('Erro:', error.response?.data || error.message);
        res.send(`
            <html>
            <body style="text-align:center; padding:50px; font-family:Arial;">
                <h2 style="color:red;">❌ Erro na verificação</h2>
                <p>Não foi possível completar a verificação.</p>
                <p>Motivo: ${error.response?.data?.error_description || error.message}</p>
                <p>Tente novamente no servidor do Discord.</p>
                <script>setTimeout(() => window.close(), 5000);</script>
            </body>
            </html>
        `);
    }
});

async function addRoleToUser(userId) {
    try {
        const guild = await botClient.guilds.fetch(CONFIG.GUILD_ID);
        const member = await guild.members.fetch(userId);
        const role = guild.roles.cache.get(CONFIG.VERIFIED_ROLE_ID);
        
        if (role && !member.roles.cache.has(CONFIG.VERIFIED_ROLE_ID)) {
            await member.roles.add(role);
            
            // Tenta enviar DM (opcional)
            try {
                await member.send('✅ **NyxAuth - Verificação Completa!**\n\nAgora você tem acesso a todos os canais do servidor.');
                console.log(`📨 DM enviada para ${member.user.tag}`);
            } catch (e) {
                console.log(`⚠️ Não foi possível enviar DM para ${member.user.tag}`);
            }
        } else if (role && member.roles.cache.has(CONFIG.VERIFIED_ROLE_ID)) {
            console.log(`ℹ️ ${member.user.tag} já possui o cargo de verificado`);
        }
    } catch (error) {
        console.error(`Erro ao adicionar cargo para ${userId}:`, error);
    }
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🌐 Servidor rodando na porta ${PORT}`);
    console.log(`🔗 Health check disponível em: http://localhost:${PORT}/health`);
});

// Log de erro do bot
botClient.on('error', (error) => {
    console.error('❌ Erro no bot do Discord:', error);
});

botClient.login(DISCORD_CONFIG.BOT_TOKEN);