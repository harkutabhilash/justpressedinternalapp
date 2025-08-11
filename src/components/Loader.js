// src/components/Loader.js
import React from 'react';

const Loader = ({ message }) => {
  let finalMessage = "Relax, data is being fetched...";

  if (message === "login") finalMessage = "Keep calm, signing in...";
  else if (message === "logout") finalMessage = "See you soon, logging out...";
  else if (message === "appBeingReady") finalMessage = "Getting your app ready...";
  else if (message === "dataBeingSubmitted") finalMessage = "Wait data is being submitted....";
  else if (typeof message === "string" && message.trim()) finalMessage = message;

  return (
    <div className="custom-loader-wrapper">
      <div className="custom-loader-circle" />
      <p className="custom-loader-message">{finalMessage}</p>
    </div>
  );
};

export default Loader;
