import React from "react";

// デプロイした環境に合わせてエンドポイントを指定してください
const socket = new WebSocket(
  "wss://*****.execute-api.ap-northeast-1.amazonaws.com/dev"
);

function WebSocketComponent() {
  React.useEffect(() => {
    const notification = window.Notification;
    var permission = notification.permission;

    if (permission === "denied" || permission === "granted") {
      return;
    }

    Notification.requestPermission();
  });

  React.useEffect(() => {
    socket.onopen = (event) => {
      console.log("onopen", event);
    };

    socket.onmessage = (event) => {
      console.log("onmessgae", event);
      new Notification(event.data);
    };

    socket.onclose = (event) => {
      console.log("onclose", event);
    };

    return () => {
      socket.close();
    };
  });

  return (
    <div>
      <p>WebSocketComponent</p>
    </div>
  );
}

export default WebSocketComponent;
