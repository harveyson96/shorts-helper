import invariant from "tiny-invariant";
import { json } from "@remix-run/node";
import  db from "../db.server"
import {redirect } from "@remix-run/node";
import { getDestinationUrl } from "../models/QRCode.server";
export const loader = async({params}) =>{
    invariant(params.id, 'Could not find QR Code Destination')

    const id = Number(params.id)
    const qrCode = await db.qRCode.findFirst({where: 
        {id}
    })

    invariant(qrCode, 'Could not find QR Code Destination')

    // incremnet the scan count
    await db.qRCode.update({
        where: {id},
        data: {scans : {increment: 1}}
    })

    //redirect
    return redirect(getDestinationUrl(qrCode))
}