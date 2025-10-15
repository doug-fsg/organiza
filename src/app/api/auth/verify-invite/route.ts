import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
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
        { error: 'Este convite expirou. Solicite um novo convite ao administrador.' },
        { status: 400 }
      )
    }

    // Retornar dados do convite
    return NextResponse.json({
      email: invite.email,
      name: invite.name,
      accountId: invite.accountId,
      role: invite.role,
    })
  } catch (error) {
    console.error('Erro ao verificar convite:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar convite' },
      { status: 500 }
    )
  }
}


