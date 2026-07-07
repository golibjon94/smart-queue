FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/SmartQueue.Gateway/SmartQueue.Gateway.csproj SmartQueue.Gateway/
RUN dotnet restore SmartQueue.Gateway/SmartQueue.Gateway.csproj
COPY src/SmartQueue.Gateway/ SmartQueue.Gateway/
RUN dotnet publish SmartQueue.Gateway/SmartQueue.Gateway.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENTRYPOINT ["dotnet", "SmartQueue.Gateway.dll"]
