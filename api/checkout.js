import Stripe from "stripe";
export default async function handler(request,response){
 if(request.method!=="POST")return response.status(405).json({error:"Méthode non autorisée."});
 if(!process.env.STRIPE_SECRET_KEY)return response.status(503).json({error:"Le paiement n'est pas encore configuré."});
 try{
  const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin="https://"+request.headers.host;
  const session=await stripe.checkout.sessions.create({mode:"payment",line_items:[{price_data:{currency:"eur",product_data:{name:"Analyse personnalisée de candidature",description:"Une analyse de CV comparé à une offre d'emploi."},unit_amount:Number(process.env.ANALYSIS_PRICE_CENTS||490)},quantity:1}],success_url:origin+"/?session_id={CHECKOUT_SESSION_ID}#outil",cancel_url:origin+"/#outil",metadata:{product:"application-analysis"}});
  return response.status(200).json({url:session.url});
 }catch(error){console.error("Checkout creation failed",error.message);return response.status(500).json({error:"Impossible de préparer le paiement pour le moment."})}
}
