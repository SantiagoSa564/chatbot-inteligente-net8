FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ChatbotApi.csproj ./
RUN dotnet restore ChatbotApi.csproj
COPY Program.cs appsettings.json ./
COPY Controllers/ Controllers/
COPY DTOs/ DTOs/
COPY Models/ Models/
COPY Services/ Services/
COPY Data/ Data/
COPY Migrations/ Migrations/
COPY wwwroot/ wwwroot/
RUN dotnet publish ChatbotApi.csproj --configuration Release --no-restore --output /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_HTTP_PORTS=8080
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "ChatbotApi.dll"]
