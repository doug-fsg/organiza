import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

// Estender tipos do NextAuth para multi-tenancy
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string | null
      accounts: {
        accountId: string
        accountName: string
        accountSlug: string
        role: UserRole
      }[]
      activeAccountId?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    image?: string | null
    accounts: {
      accountId: string
      accountName: string
      accountSlug: string
      role: UserRole
    }[]
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    accounts: {
      accountId: string
      accountName: string
      accountSlug: string
      role: UserRole
    }[]
    activeAccountId?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        try {
          // Buscar usuário com suas contas
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              accounts: {
                include: {
                  account: true,
                },
              },
            },
          })

          if (!user) {
            throw new Error('Email ou senha incorretos')
          }

          // Verificar senha
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            throw new Error('Email ou senha incorretos')
          }

          // Verificar se usuário tem pelo menos uma conta
          if (user.accounts.length === 0) {
            throw new Error('Usuário não está vinculado a nenhuma conta')
          }

          // Mapear contas do usuário
          const userAccounts = user.accounts.map((acc) => ({
            accountId: acc.accountId,
            accountName: acc.account.name,
            accountSlug: acc.account.slug,
            role: acc.role,
          }))

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            accounts: userAccounts,
          }
        } catch (error) {
          console.error('Erro na autenticação:', error)
          throw error
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Login inicial
      if (user) {
        token.id = user.id
        token.accounts = user.accounts
        // Definir conta ativa (primeira por padrão)
        token.activeAccountId = user.accounts[0]?.accountId
      }

      // Atualização de sessão (troca de conta)
      if (trigger === 'update' && session?.activeAccountId) {
        // Verificar se o usuário tem acesso à conta
        const hasAccess = token.accounts.some(
          (acc) => acc.accountId === session.activeAccountId
        )
        if (hasAccess) {
          token.activeAccountId = session.activeAccountId
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id
        session.user.accounts = token.accounts
        session.user.activeAccountId = token.activeAccountId
      }
      return session
    },
  },

  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev-only',

  debug: process.env.NODE_ENV === 'development',
} 