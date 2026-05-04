# NyxAuth Bot

Bot de verificação automática para Discord usando OAuth2.

## Configuração

As seguintes variáveis de ambiente são necessárias:

- `CLIENT_ID` - ID do aplicativo Discord
- `CLIENT_SECRET` - Secret do aplicativo Discord  
- `BOT_TOKEN` - Token do bot Discord
- `GUILD_ID` - ID do servidor
- `AUTH_CHANNEL_ID` - ID do canal de verificação
- `VERIFIED_ROLE_ID` - ID do cargo de verificado
- `REDIRECT_URI` - URL de callback (opcional, será gerada automaticamente)

## Deploy

Este bot está configurado para deploy no Render.com com health check para cron-job.org.