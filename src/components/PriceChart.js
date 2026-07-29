"use client";

import { useState, useMemo } from "react";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const X_COORDS = [30, 115, 200, 285, 370];

/**
 * Real price history chart. Only renders points backed by actual
 * PriceHistory rows — callers should not pass fabricated data.
 */
export default function PriceChart({ priceHistories }) {
  const [activeDotIndex, setActiveDotIndex] = useState(4);

  const chartData = useMemo(() => {
    if (!priceHistories || priceHistories.length < 2) return [];

    const histories = [...priceHistories].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const last5 = histories.slice(-5);

    let calculatedPoints = last5.map(h => {
      const d = new Date(h.createdAt);
      return {
        price: Math.round(h.price),
        label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
        dateStr: `${d.getDate()} ${MONTHS[d.getMonth()]}`
      };
    });

    // Pad beginning if we have less than 5 real points for the layout
    while (calculatedPoints.length < 5) {
      calculatedPoints.unshift({ ...calculatedPoints[0] });
    }

    const prices = calculatedPoints.map(p => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;

    return calculatedPoints.map((pt, i) => {
      const x = X_COORDS[i];
      // Invertir Y: precio alto arriba (Y=25), precio bajo abajo (Y=125)
      const y = 125 - ((pt.price - minP) / range) * 100;
      return { ...pt, x, y };
    });
  }, [priceHistories]);

  const { linePathD, areaPathD } = useMemo(() => {
    if (!chartData.length) return { linePathD: "", areaPathD: "" };
    const linePathD = chartData.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPathD = `${linePathD} L ${chartData[chartData.length - 1].x} 150 L ${chartData[0].x} 150 Z`;
    return { linePathD, areaPathD };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="price-chart-box">
        <div className="price-chart-empty">
          <span className="price-chart-title">Precio verificado hoy</span>
          <p>Aún no tenemos suficiente historial para mostrar la evolución de este precio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="price-chart-box">
      <div className="price-chart-header">
        <span className="price-chart-title">Evolución de Precio</span>
        <span className="price-chart-hover-val">
          {chartData[activeDotIndex] ? (
            `Precio: $${chartData[activeDotIndex].price.toLocaleString("es-MX")}`
          ) : ""}
        </span>
      </div>

      <div className="price-chart-svg-wrap">
        {chartData[activeDotIndex] && (
          <div
            className="price-chart-tooltip"
            style={{
              left: `${(chartData[activeDotIndex].x / 400) * 100}%`,
              top: `${(chartData[activeDotIndex].y / 150) * 100}%`,
              transform: activeDotIndex === 4
                ? 'translate(-85%, -100%) translateY(-12px)'
                : activeDotIndex === 0
                ? 'translate(-15%, -100%) translateY(-12px)'
                : 'translate(-50%, -100%) translateY(-12px)'
            }}
          >
            <span className="price-chart-tooltip-price">
              ${chartData[activeDotIndex].price.toLocaleString("es-MX")}
            </span>
            <span className="price-chart-tooltip-date">
              {chartData[activeDotIndex].dateStr}
            </span>
          </div>
        )}

        <svg viewBox="0 0 400 150" className="price-chart-svg">
          <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--clr-orange)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--clr-orange)" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Líneas de cuadrícula horizontales */}
          <line x1="25" y1="25" x2="375" y2="25" className="price-chart-grid-line" />
          <line x1="25" y1="75" x2="375" y2="75" className="price-chart-grid-line" />
          <line x1="25" y1="125" x2="375" y2="125" className="price-chart-grid-line" />

          {/* Área sombreada */}
          <path d={areaPathD} className="price-chart-area" />

          {/* Línea principal */}
          <path d={linePathD} className="price-chart-line" />

          {/* Puntos interactivos */}
          {chartData.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={activeDotIndex === idx ? 6 : 4.5}
              className={`price-chart-dot${activeDotIndex === idx ? " active" : ""}`}
              onMouseEnter={() => setActiveDotIndex(idx)}
              onClick={() => setActiveDotIndex(idx)}
            />
          ))}

          {/* Círculos invisibles gigantes para optimización táctil en móviles */}
          {chartData.map((pt, idx) => (
            <circle
              key={`touch-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={22}
              fill="transparent"
              stroke="none"
              style={{ cursor: "pointer", pointerEvents: "all" }}
              onMouseEnter={() => setActiveDotIndex(idx)}
              onClick={() => setActiveDotIndex(idx)}
              onTouchStart={() => setActiveDotIndex(idx)}
            />
          ))}
        </svg>
      </div>

      {/* Fechas alineadas abajo */}
      <div className="price-chart-dates">
        {chartData.map((pt, idx) => (
          <button
            key={idx}
            className={`price-chart-date-item${activeDotIndex === idx ? " active" : ""}`}
            onMouseEnter={() => setActiveDotIndex(idx)}
            onClick={() => setActiveDotIndex(idx)}
            onTouchStart={() => setActiveDotIndex(idx)}
            style={{ background: "none", border: "none", cursor: "pointer", outline: "none" }}
          >
            <div>{pt.dateStr}</div>
            <div style={{ fontSize: "0.6rem", opacity: 0.6, marginTop: "0.1rem" }}>
              ({pt.label})
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
