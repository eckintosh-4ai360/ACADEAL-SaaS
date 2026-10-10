import { defineConfig } from '@prisma/config'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  earlyAccess: true,
  datasource: {
    url: process.env.DATABASE_URL,
    // @ts-expect-error - directUrl is supported in runtime but missing in types
    directUrl: process.env.DIRECT_URL,
  },
})
