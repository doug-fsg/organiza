import { useCallback, useRef, useEffect } from 'react'

/**
 * Hook para tocar som de notificação simples
 * Usa Web Audio API (sem necessidade de arquivo)
 */
export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null)

  // Inicializar o contexto de áudio na montagem do componente
  useEffect(() => {
    // Criar contexto de áudio apenas uma vez
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContextClass()
      } catch (error) {
        console.error('Erro ao criar AudioContext:', error)
      }
    }

    // Cleanup ao desmontar
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  const playNotificationSound = useCallback(() => {
    const playSound = (audioContext: AudioContext) => {
      try {
        // Criar um som de notificação suave
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        // Conectar os nós
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        // Configurar o som
        oscillator.type = 'sine' // Som suave
        oscillator.frequency.setValueAtTime(520, audioContext.currentTime) // Nota C suave
        
        // Volume e fade out
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime) // Volume baixo
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15) // Fade out
        
        // Tocar
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.15) // Duração curta
      } catch (error) {
        console.error('Erro ao criar som:', error)
      }
    }

    try {
      const audioContext = audioContextRef.current
      
      if (!audioContext) {
        console.warn('AudioContext não disponível')
        return
      }

      // Resumir o contexto se estiver suspenso (política de autoplay)
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          playSound(audioContext)
        }).catch(err => {
          console.warn('Não foi possível tocar o som:', err)
        })
      } else {
        playSound(audioContext)
      }
    } catch (error) {
      console.error('Erro ao tocar som de notificação:', error)
    }
  }, [])

  return { playNotificationSound }
}

