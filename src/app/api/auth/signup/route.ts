import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accountName, name, email, password } = body

    // Validações básicas
    if (!accountName || !name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado' },
        { status: 400 }
      )
    }

    // Criar slug da conta (URL amigável)
    const baseSlug = accountName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífen
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim()

    // Verificar se slug já existe e criar um único
    let slug = baseSlug
    let counter = 1
    while (await prisma.account.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Criar conta e usuário em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar a conta
      const account = await tx.account.create({
        data: {
          name: accountName,
          slug,
        },
      })

      // 2. Criar o usuário
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      })

      // 3. Vincular usuário à conta como OWNER
      await tx.accountUser.create({
        data: {
          userId: user.id,
          accountId: account.id,
          role: UserRole.OWNER,
        },
      })

      return { account, user }
    })

    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso!',
      data: {
        accountId: result.account.id,
        accountSlug: result.account.slug,
        userId: result.user.id,
      },
    })
  } catch (error) {
    console.error('Erro ao criar conta:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor. Tente novamente.' },
      { status: 500 }
    )
  }
} 