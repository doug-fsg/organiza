import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { nanoid } from 'nanoid'

const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
const MAX_FILES = 10
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum arquivo foi enviado' },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_FILES} arquivos por vez` },
        { status: 400 }
      )
    }

    // Verificar tamanho dos arquivos
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo "${file.name}" excede o limite de 200MB` },
          { status: 400 }
        )
      }
    }

    // Criar diretório se não existir
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const uploadedFiles = []

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Gerar nome único
      const ext = path.extname(file.name)
      const uniqueName = `${nanoid()}${ext}`
      const filePath = path.join(UPLOAD_DIR, uniqueName)

      // Salvar arquivo
      await writeFile(filePath, buffer)

      uploadedFiles.push({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        filePath: `/uploads/${uniqueName}`, // Caminho público
      })
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    })
  } catch (error) {
    console.error('Erro ao fazer upload:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer upload dos arquivos' },
      { status: 500 }
    )
  }
}


