import { useCallback } from 'react'

/**
 * Hook para tocar som de notificação simples
 * Usa Web Audio API (sem necessidade de arquivo)
 */
export function useNotificationSound() {
  const playNotificationSound = useCallback(() => {
    // Verificar se o usuário permite sons
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    // Criar um som de notificação suave (440 Hz por 200ms)
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    // Conectar os nós
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Configurar o som
    oscillator.type = 'sine' // Som suave
    oscillator.frequency.setValueAtTime(520, audioContext.currentTime) // Nota C (suave)
    
    // Volume e fade out
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime) // Volume baixo
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15) // Fade out
    
    // Tocar
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.15) // Duração curta
    
    // Limpar
    setTimeout(() => {
      audioContext.close()
    }, 200)
  }, [])

  return { playNotificationSound }
}

