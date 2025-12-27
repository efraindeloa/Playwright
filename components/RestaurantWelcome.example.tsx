/**
 * Ejemplo de uso del componente RestaurantWelcome
 * 
 * Este archivo muestra cómo usar el componente RestaurantWelcome en una aplicación React.
 * 
 * Para usar este componente, necesitarás:
 * 1. Instalar las dependencias de React y Tailwind CSS
 * 2. Configurar Tailwind CSS según tailwind.config.ts
 * 3. Agregar las fuentes de Google Fonts en tu index.html o _document.tsx
 */

import React from 'react';
import RestaurantWelcome from './RestaurantWelcome';

const App: React.FC = () => {
  const handleCreateAccount = () => {
    console.log('Crear cuenta');
    // Navegar a página de registro
  };

  const handleLogIn = () => {
    console.log('Iniciar sesión');
    // Navegar a página de login
  };

  const handleContinueAsGuest = () => {
    console.log('Continuar como invitado');
    // Permitir acceso limitado sin cuenta
  };

  return (
    <RestaurantWelcome
      onCreateAccount={handleCreateAccount}
      onLogIn={handleLogIn}
      onContinueAsGuest={handleContinueAsGuest}
    />
  );
};

export default App;

