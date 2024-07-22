import db from "../db.server"
import qrcode from "qrcode"
import invariant from "tiny-invariant";

// get single QR Code
export async function getQRCode(id, graphql) {
    const qrCode = await db.qRCode.findFirst({ where: { id } });
  
    if (!qrCode) {
      return null;
    }
  
    return supplementQRCode(qrCode, graphql);
  }

// get multiple QR Codes
export async function getQRCodes(shop, graphql){
    const qrCodes = await db.qRCode.findMany({
        where: {shop},
        orderBy: {id: "desc"}
    })
    if(qrCodes === 0){
        return []
    }
    return Promise.all(qrCodes.map((qrCode) => supplementQRCode(qrCode, graphql)))
}
// construct the URL and use qrcode to return image
export function getQRCodeImage(id){
    const url = new URL(`/qrcodes/${id}/scan`, process.env.SHOPIFY_APP_URL);
    return qrcode.toDataURL(url.href);
}
// scan QR take user to product detail pages, or checkout
export function getDestinationUrl(qrCode){
    if(qrCode.destination === "product"){
        return `https://${qrCode.shop}/products/${qrCode.productHandle}`;
    }
    // check 
    const match = /gid:\/\/shopify\/ProductVariant\/([0-9]+)/.exec(qrCode.productVariantId);
    invariant(match, "Unrecognized product variant ID")

    return `https://${qrCode.shop}/cart/${match[1]}:1`
}
// retrieve additional product and variant data from graphql
// create a function the queries the graphql for title and more info.
async function supplementQRCode(qrCode
, graphql){
    const qrCodeImagePromise = getQRCodeImage(qrCode.id)
    const response = await graphql(
        `
        query supplementQRCode($id: ID!){
            product(id: $id){
                title
                images(first: 1){
                    nodes{
                        altText
                        url
                    }
                }
            }
        }`,
        {
            variables:{
                id: qrCode.productId,
            }
        }
    )
    const {
        data: {product},
    } = await response.json();
    return {
        ...qrCode,
        productDeleted: !product?.title,
        productTitle: product?.title,
        productImage: product?.images?.nodes[0]?.url,
        productAlt: product?.images?.nodes[0]?.altText,
        destinationUrl: getDestinationUrl(qrCode),
        image: await qrCodeImagePromise,
      };
}
//validate qr code
export function validateQRCode(data){
    const errors = {}
    if(!data.title){
        errors.title = 'Title is required';
    }
    if(!data.productId){
        errors.productId = "Product is required"
    }
    if(!data.destination){
        errors.destination = "Product is required"
    }
    if(Object.keys(errors).length){
        return errors;
    }
}
