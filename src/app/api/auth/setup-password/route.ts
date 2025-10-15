import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar senha
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 8 caracteres' },
        { status: 400 }
      )
    }

    // Buscar convite
    const invite = await prisma.userInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já foi usado
    if (invite.usedAt) {
      return NextResponse.json(
        { error: 'Este convite já foi utilizado' },
        { status: 400 }
      )
    }

    // Verificar se expirou
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: 'Este convite expirou' },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Verificar se o usuário já existe
    let user = await prisma.user.findUnique({
      where: { email: invite.email },
    })

    if (user) {
      // Usuário existe, apenas adicionar à conta
      await prisma.accountUser.create({
        data: {
          userId: user.id,
          accountId: invite.accountId,
          role: invite.role,
        },
      })
    } else {
      // Criar novo usuário
      user = await prisma.user.create({
        data: {
          name: invite.name,
          email: invite.email,
          password: hashedPassword,
          emailVerified: new Date(),
          accounts: {
            create: {
              accountId: invite.accountId,
              role: invite.role,
            },
          },
        },
      })
    }

    // Marcar convite como usado
    await prisma.userInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Senha criada com sucesso!',
    })
  } catch (error) {
    console.error('Erro ao criar senha:', error)
    return NextResponse.json(
      { error: 'Erro ao criar senha. Tente novamente.' },
      { status: 500 }
    )
  }
}


