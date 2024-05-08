import { UserRoles } from "@/app/admin/access-control/access-control"
import { auth, authUser } from '@/auth'
import { cookies } from 'next/headers'
import { GetTranslation } from "@/components/translation-helper/ClientTranslations"
import GlobalConfig from '@/app/app.config.js'

export const runtime = 'nodejs'
export const preferredRegion = 'home'
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const TextDirection = process.env.TEXT_DIRECTION


export default async function SettingsAccountPage() {
  const cookieStore = cookies()
  const session = await authUser()

  return (
    <div className="space-y-6 w-full group overflow-auto pl-12 pt-10 peer-[[data-state=open]]:lg:pl-[350px] peer-[[data-state=open]]:xl:pl-[350px]">
      <div>
        <h3 className="text-lg font-medium" dir={TextDirection}>
          {/* {TranslationData["Manage User Roles"]} */}
          <GetTranslation text="Manage User Roles" />
          </h3>
        <p className="text-sm text-muted-foreground" dir={TextDirection}>
        {/* {TranslationData["Assign roles to users using the table below"]} */}
        <GetTranslation text="Assign roles to users using the table below" />        
        </p>
        <></>
        <p className="text-sm text-muted-foreground" dir={TextDirection}> 
        {/* {TranslationData["* Please wait for a few seconds for the changes you have made to take effect."]} */}
        <GetTranslation text="* Please wait for a few seconds for the changes you have made to take effect." />
        
         </p>
      </div>
      <UserRoles user_email={session?.user?.email} />
    </div>
  )
}

