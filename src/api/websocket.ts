import { useEffect, useRef, useState } from 'react';

export const useSeatWebSocket = (scheduleId: number | undefined, userId: string | null) => {
  const [occupiedSeats, setOccupiedSeats] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!scheduleId || !userId) return;
    const socket = new WebSocket(`ws://127.0.0.1:8080/api/ws-seats?scheduleId=${scheduleId}&userId=${userId}`);
    socketRef.current = socket;

    socket.onopen = () => setIsConnected(true);
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "INIT_STATE") {
        const map: Record<string, string> = {};
        data.occupied.forEach((s: string) => { const parts = s.split(":"); map[parts[1]] = parts[2]; });
        setOccupiedSeats(map);
      } else if (data.type === "OCCUPIED") {
        setOccupiedSeats(prev => { 
          const next = { ...prev };
          data.seats.forEach((s: string) => { const parts = s.split(":"); next[parts[1]] = parts[2]; });
          return next;
        });
      } else if (data.type === "RELEASED") {
        setOccupiedSeats(prev => {
          const next = { ...prev };
          data.seats.forEach((s: string) => { delete next[s.split(":")[1]]; });
          return next;
        });
      }
    };
    socket.onclose = () => setIsConnected(false);
    return () => socket.close();
  }, [scheduleId, userId]);

  const toggleSeat = (seatIds: string[]) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ scheduleId, seats: seatIds.map(id => ({ seatNumber: id })) }));
    }
  };

  return { occupiedSeats, isConnected, toggleSeat };
};