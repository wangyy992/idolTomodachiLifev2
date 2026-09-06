# 国内/容器平台部署用（Zeabur / Render / Railway / ClawCloud / 自己带 Docker 的服务器）
# 不影响 Vercel —— Vercel 对 Vite 项目走自己的检测，不会用这个 Dockerfile。

# ---- 构建阶段：装依赖 + 打包前端 ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- 运行阶段：只带产物 + 自托管服务 ----
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs
COPY --from=build /app/package.json ./package.json
ENV PORT=8080
EXPOSE 8080
# DEEPSEEK_API_KEY 在平台的环境变量里配，不要写进镜像
CMD ["node", "server.mjs"]
