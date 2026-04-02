# 🛰️ SIGNAL INTERCEPTOR: Standing Wave Detector

An interactive physics-based simulation and puzzle game built with **React**, **Vite**, and **Tailwind CSS**. Challenge your understanding of wave mechanics and light reflection by intercepting signals and manipulating laser paths.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

---

## 🚀 Features

- **Standing Wave Simulation:** Real-time visualization of interference patterns and standing waves using HTML5 Canvas.
- **Interactive Physics:** Dynamic ray-casting and reflection logic governed by the Law of Reflection.
- **Cyberpunk UI:** A high-tech aesthetic powered by Tailwind CSS, featuring real-time telemetry and signal strength indicators.
- **Dynamic Difficulty:** Adjustable wavelength counts ($k = \text{waveCount} \times \pi$) to increase the complexity of signal interception.

## 🎮 How to Play

1.  **The Mission:** A wireless signal carrying a password bounces off a metal wall. You must locate the strongest signal points to decode it.
2.  **Locate Antinodes:** Drag your interceptor across the wave to find the points of maximum amplitude (Antinodes).
3.  **Avoid Nodes:** Blue "Node" points represent zero signal where waves cancel out.
4.  **Security Bypass:** In the Laser Ops module, use mirrors to reflect the beam into the hidden override sensor.

## 🛠️ Tech Stack

- **Framework:** React.js (Hooks: `useState`, `useRef`, `useEffect`, `useCallback`)
- **Styling:** Tailwind CSS (for modern, responsive UI)
- **Graphics:** HTML5 Canvas API (for high-performance physics rendering)
- **Animations:** Framer Motion

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1.  Install the project dependencies:
    ```bash
    npm install
    ```
2.  Launch the local development server:
    ```bash
    npm run dev
    ```

---

🌐 **Live Website**

[Open the website](https://celebrated-trifle-fb6c47.netlify.app/)

## 📝 Physics Constants & Logic

The project utilizes several core physics principles:

- **Law of Reflection:** $\theta_i = \theta_r$
- **Standing Wave Equation:** $A(x) = 2A_0 \sin(kx)$
- **Wavelength Logic:** Proximity thresholds determine the accuracy of node and antinode detection.
