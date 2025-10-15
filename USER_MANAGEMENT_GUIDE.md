# 📚 Guia de Gerenciamento de Usuários

## ✅ Sistema Implementado

O sistema de gerenciamento de usuários com envio de email para criação de senha foi implementado com sucesso!

## 🎯 Funcionalidades

### Para Administradores

1. **Convidar Novos Usuários**
   - Acesse o painel "Gerenciamento de Usuários" no menu lateral
   - Clique em "Convidar Usuário"
   - Preencha nome, email e função (role)
   - Um email será enviado automaticamente com o link de ativação

2. **Gerenciar Usuários Existentes**
   - Visualizar lista completa de usuários
   - Alterar role/função de qualquer usuário
   - Remover usuários da conta
   - Ver status de verificação de email

3. **Gerenciar Convites**
   - Ver todos os convites pendentes
   - Reenviar convites expirados
   - Cancelar convites não utilizados
   - Convites expiram em 7 dias

### Para Novos Usuários

1. **Receber Convite**
   - Você receberá um email no endereço informado
   - O email contém um link único e seguro

2. **Criar Senha**
   - Clique no link do email
   - Crie uma senha segura seguindo os requisitos:
     - Mínimo 8 caracteres
     - Pelo menos uma letra maiúscula
     - Pelo menos uma letra minúscula
     - Pelo menos um número
   - Confirme a senha

3. **Acesso Automático**
   - Após criar a senha, você será automaticamente logado
   - Pronto para usar o TaskFlow!

## 🔐 Segurança

- **Tokens únicos**: Cada convite tem um token único e criptograficamente seguro
- **Expiração**: Links expiram em 7 dias
- **Uso único**: Cada convite só pode ser usado uma vez
- **Senhas seguras**: Requisitos mínimos de complexidade
- **Hash bcrypt**: Senhas armazenadas com criptografia bcrypt

## 📧 Configuração de Email

O sistema está configurado para usar Gmail SMTP. As credenciais já estão no arquivo `.env`:

```env
EMAIL_SERVER=smtp://suporteinovechat%40gmail.com:dsknphgnlbgskvso@smtp.gmail.com:587
EMAIL_FROM=ManyTalks <suporteinovechat@gmail.com>
```

### Formato do Email

O email enviado inclui:
- ✅ Design responsivo e profissional
- ✅ Botão de ação destacado
- ✅ Link alternativo para copiar/colar
- ✅ Aviso de expiração em 7 dias
- ✅ Branding do TaskFlow

## 🎨 Interface

### Painel de Administração

O painel possui 3 cards informativos:
- **Usuários Ativos**: Total de usuários na conta
- **Convites Pendentes**: Convites aguardando aceitação
- **Administradores**: Número de admins/owners

### Tabs

1. **Usuários**: Lista completa com:
   - Nome, email, função
   - Status de verificação
   - Data de cadastro
   - Ações rápidas (alterar role, remover)

2. **Convites Pendentes**: Lista com:
   - Nome, email, função
   - Datas de envio e expiração
   - Ações (reenviar, cancelar)

## 🚀 Como Testar

1. **Fazer Login como Admin**
   ```
   Email: admin@taskflow.com
   Senha: [sua senha de admin]
   ```

2. **Acessar Gerenciamento**
   - No menu lateral, clique em "Usuários"
   - Você verá o painel completo

3. **Convidar um Usuário de Teste**
   - Clique em "Convidar Usuário"
   - Use seu próprio email alternativo
   - Selecione uma função
   - Envie o convite

4. **Verificar Email**
   - Acesse a caixa de entrada do email convidado
   - Procure por email de "ManyTalks" ou "TaskFlow"
   - Verifique spam/lixo eletrônico caso não apareça

5. **Criar Senha**
   - Clique no link do email
   - Crie uma senha segura
   - Confirme e aguarde login automático

## 📋 Roles/Funções

### OWNER (Proprietário)
- Acesso total ao sistema
- Não pode ser removido se for o único owner
- Pode gerenciar todos os usuários

### ADMIN (Administrador)
- Acesso total ao sistema
- Pode gerenciar usuários
- Pode convidar novos membros

### MANAGER (Gerente)
- Pode gerenciar tarefas
- Pode aprovar/rejeitar subtarefas
- Não pode gerenciar usuários

### MEMBER (Membro)
- Acesso básico
- Executa tarefas atribuídas
- Visualiza calendário e kanban

## 🛠️ Arquivos Criados/Modificados

### Novos Arquivos
1. `prisma/schema.prisma` - Adicionado modelo `UserInvite`
2. `src/server/api/routers/user-management.ts` - Router tRPC
3. `src/components/user-management.tsx` - Interface de gerenciamento
4. `src/app/auth/setup-password/page.tsx` - Página de criação de senha
5. `src/app/api/auth/verify-invite/route.ts` - API de verificação
6. `src/app/api/auth/setup-password/route.ts` - API de criação de senha

### Arquivos Modificados
1. `src/server/api/root.ts` - Adicionado router userManagement
2. `src/components/dashboard-layout.tsx` - Integrado componente

### Dependências Instaladas
```json
{
  "nodemailer": "^6.9.x",
  "@types/nodemailer": "^6.4.x",
  "date-fns": "^3.x.x"
}
```

## 🐛 Troubleshooting

### Email não está sendo enviado

1. Verifique as credenciais no `.env`
2. Confirme que o Gmail permite "apps menos seguros" ou use senha de app
3. Verifique logs do servidor para erros específicos

### Link do convite não funciona

1. Verifique se o link não expirou (7 dias)
2. Confirme que o token está completo na URL
3. Tente reenviar o convite

### Erro ao criar senha

1. Verifique se a senha atende aos requisitos
2. Confirme que as senhas coincidem
3. Verifique se o convite não foi usado anteriormente

## 📊 Banco de Dados

### Tabela user_invites

```sql
CREATE TABLE "user_invites" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" DATETIME NOT NULL,
  "usedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT NOT NULL
);
```

## ✨ Melhorias Futuras

- [ ] Dashboard de analytics de convites
- [ ] Notificações in-app para admins
- [ ] Limite de tentativas de convite
- [ ] Customização de email templates
- [ ] Convites em massa via CSV
- [ ] Integração com SSO (Google, Microsoft)

---

**Desenvolvido com ❤️ para TaskFlow**


