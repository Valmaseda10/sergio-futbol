"use client";

import { useEffect, useState } from "react";

interface EstadoCronometro {
  segundosAcumulados: number;
  corriendo: boolean;
  inicioTs: number | null;
}

const ESTADO_INICIAL: EstadoCronometro = {
  segundosAcumulados: 0,
  corriendo: false,
  inicioTs: null,
};

function clavePartido(partidoId: string) {
  return `tagueo-cronometro-${partidoId}`;
}

function cargar(partidoId: string): EstadoCronometro {
  try {
    const raw = localStorage.getItem(clavePartido(partidoId));
    if (!raw) return ESTADO_INICIAL;
    const parsed = JSON.parse(raw) as Partial<EstadoCronometro>;
    return {
      segundosAcumulados:
        typeof parsed.segundosAcumulados === "number"
          ? parsed.segundosAcumulados
          : 0,
      corriendo: !!parsed.corriendo,
      inicioTs: typeof parsed.inicioTs === "number" ? parsed.inicioTs : null,
    };
  } catch {
    return ESTADO_INICIAL;
  }
}

function guardar(partidoId: string, estado: EstadoCronometro) {
  try {
    localStorage.setItem(clavePartido(partidoId), JSON.stringify(estado));
  } catch {
    // localStorage puede fallar (privado, cuota llena...): el cronómetro
    // sigue funcionando en memoria durante la sesión, solo no sobrevive a
    // recargar la página.
  }
}

/**
 * Cronómetro del partido con play/pausa (para el descanso), guardado por
 * partido en este dispositivo: al recargar la página sigue contando bien
 * porque se apoya en la hora real, no en un intervalo que se pierde.
 *
 * La lectura del reloj (Date.now()) se hace siempre dentro de un efecto o de
 * un manejador de evento, nunca durante el render, para no violar la regla
 * de pureza de componentes/hooks.
 */
export function useCronometro(partidoId: string) {
  const [estado, setEstado] = useState<EstadoCronometro>(() =>
    cargar(partidoId),
  );
  const [segundosMostrados, setSegundosMostrados] = useState(
    () => cargar(partidoId).segundosAcumulados,
  );

  useEffect(() => {
    guardar(partidoId, estado);
  }, [partidoId, estado]);

  useEffect(() => {
    function actualizar() {
      if (estado.corriendo && estado.inicioTs != null) {
        setSegundosMostrados(
          estado.segundosAcumulados +
            Math.floor((Date.now() - estado.inicioTs) / 1000),
        );
      } else {
        setSegundosMostrados(estado.segundosAcumulados);
      }
    }

    actualizar();
    if (!estado.corriendo) return;
    const interval = setInterval(actualizar, 1000);
    return () => clearInterval(interval);
  }, [estado]);

  function toggle() {
    setEstado((prev) => {
      if (prev.corriendo) {
        const transcurrido =
          prev.inicioTs != null
            ? Math.floor((Date.now() - prev.inicioTs) / 1000)
            : 0;
        return {
          segundosAcumulados: prev.segundosAcumulados + transcurrido,
          corriendo: false,
          inicioTs: null,
        };
      }
      return { ...prev, corriendo: true, inicioTs: Date.now() };
    });
  }

  function reiniciar() {
    setEstado({ ...ESTADO_INICIAL });
  }

  return {
    corriendo: estado.corriendo,
    minuto: Math.floor(segundosMostrados / 60),
    segundos: segundosMostrados % 60,
    toggle,
    reiniciar,
  };
}
