<?php

declare(strict_types=1);

namespace FlexPay\Http;

final class Router
{
    /** @var array<string, array<string, callable|array>> */
    private array $routes = [];

    public function add(string $method, string $path, callable|array $handler): void
    {
        $this->routes[strtoupper($method)][$path] = $handler;
    }

    public function dispatch(Request $request): void
    {
        $method = strtoupper($request->method());
        $path = $request->path();

        $routes = $this->routes[$method] ?? [];
        $matchedHandler = null;
        $matchedParams = [];

        foreach ($routes as $route => $handler) {
            $pattern = preg_replace('/\:([A-Za-z0-9_]+)/', '(?P<$1>[^/]+)', $route);
            $regex = '#^' . str_replace('/', '\/', $pattern) . '$#';

            if (preg_match($regex, $path, $matches) === 1) {
                $matchedHandler = $handler;
                $matchedParams = [];
                foreach ($matches as $key => $value) {
                    if (is_string($key)) {
                        $matchedParams[$key] = $value;
                    }
                }
                break;
            }
        }

        if ($matchedHandler === null) {
            Response::error('Route not found.', 404);
        }

        if (is_callable($matchedHandler)) {
            $matchedHandler($request, $matchedParams);
            return;
        }

        [$controllerName, $methodName] = $matchedHandler;

        if (!class_exists($controllerName)) {
            Response::error('Controller not found.', 500);
        }

        $controller = new $controllerName();
        if (!method_exists($controller, $methodName)) {
            Response::error('Action not found.', 500);
        }

        $controller->$methodName($request, $matchedParams);
    }
}
