import { NextResponse } from "next/server"
import Stripe from 'stripe'

export async function GET(){
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const precios = await stripe.prices.list()
    console.log(precios)
    return NextResponse.json({
        message: "Hola desde /api/pagos",
    })
}