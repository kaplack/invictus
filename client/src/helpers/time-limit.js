export const formatTimeLimit=minutes=>Math.floor(minutes/60)+' h '+String(minutes%60).padStart(2,'0')+' min';
export function timeLimitMinutes(enabled,hours,minutes){
 if(!enabled)return null;
 const h=Number(hours),m=Number(minutes),total=h*60+m;
 if(!Number.isInteger(h)||h<0||!Number.isInteger(m)||m<0||m>59||!Number.isSafeInteger(total)||total<=0||total>2147483647)throw Error('Ingresa un tiempo límite mayor a cero, con horas enteras no negativas y minutos de 0 a 59.');
 return total;
}
