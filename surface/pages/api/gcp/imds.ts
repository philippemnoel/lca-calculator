import type { NextApiRequest, NextApiResponse } from "next"
import { withApiAuthRequired } from "@auth0/nextjs-auth0"
import { supabase } from "lib/api/supabase"

import { post } from "lib/api"

const parserFunctionUrl = process.env.MDS_PARSER_FUNCTION_URL ?? ""

async function request(body: any): Promise<any> {
  return await post(parserFunctionUrl, body)
}

export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
      try {
        const lcaId = req.body.lca_id
        const docs = req.body.docs
        const orgId = req.body.org_id

        if (docs === undefined || orgId === undefined) {
          res.status(400).end()
          return
        }

        console.log(
          `Processing documents for orgId ${orgId}, invoking mds parser`
        )

        for (const doc of docs) {
          // TODO: get signed url instead of public url, make buckets private
          const { data } = supabase.storage
            .from(doc.bucket)
            .getPublicUrl(doc.path)

          const mdsParserResponse = await request({
            org_id: orgId,
            lca_id: lcaId,
            file_url: data.publicUrl,
          })

          if (mdsParserResponse.status !== 200) {
            res
              .status(mdsParserResponse.status)
              .send(mdsParserResponse.statusText)
          }
        }

        console.log(`Successfully parsed mds document`)

        res.status(200).end()
      } catch (err) {
        console.error(err)
        res.status(500).end()
      }
    } else {
      res.status(404).end()
    }
  }
)
