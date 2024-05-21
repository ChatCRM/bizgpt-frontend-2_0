// @ts-nocheck
import { KnowledgeBaseTable } from "@/app/admin/knowledgebase-details/knowledgebase-table"

export const runtime = 'nodejs'
export const preferredRegion = 'home'
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import { GetTranslation } from "@/components/translation-helper/ClientTranslations"

const TextDirection = process.env.TEXT_DIRECTION
import GlobalConfig from '@/app/app.config.js'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import ArrowForwardIosOutlinedIcon from '@mui/icons-material/ArrowForwardIosOutlined';
import OutlineInstanceButton from "@/components/outline-instance-button"
import { AdministrationComponent } from '@/app/admin/components/administration-component'

export default async function KnowledgeBaseOverView() {
  return (
    <div className="space-y-6 w-full group overflow-auto pl-12 pt-10 peer-[[data-state=open]]:lg:pl-[350px] peer-[[data-state=open]]:xl:pl-[350px]">
      {/* <AdministrationComponent/> */}
      <div>
        <h3 className="text-lg font-medium" dir={TextDirection}>
          <GetTranslation text="Knowledgebase"/>
        </h3>
        <p className="text-sm text-muted-foreground" dir={TextDirection}>
          <GetTranslation text="Examine the data you have inserted so far" />
        </p>
      </div>
      <> </>
      <OutlineInstanceButton />
    </div>
  )
}
