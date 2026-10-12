export function whatsappDestination(phone){
 if(typeof phone!=='string'||!/^[+\d][\d\s().-]*$/.test(phone.trim()))return null;
 const digits=phone.replace(/\D/g,'');
 if(/^9\d{8}$/.test(digits))return '51'+digits;
 if(/^519\d{8}$/.test(digits))return digits;
 if(phone.trim().startsWith('+')&&/^[1-9]\d{7,14}$/.test(digits))return digits;
 return null;
}
