using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductService.Data;
using ProductService.Models;
using Shared;

namespace ProductService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly ProductDbContext _context;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(ProductDbContext context, ILogger<ProductsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<Product>>>> GetProducts([FromQuery] string? category = null)
    {
        var query = _context.Products.AsQueryable();

        if (!string.IsNullOrEmpty(category))
        {
            query = query.Where(p => p.Category == category);
        }

        var products = await query.ToListAsync();
        return Ok(ApiResponse<IEnumerable<Product>>.Ok(products));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<Product>>> GetProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound(ApiResponse<Product>.Fail("Product not found"));
        }

        return Ok(ApiResponse<Product>.Ok(product));
    }

    [HttpGet("sku/{sku}")]
    public async Task<ActionResult<ApiResponse<Product>>> GetProductBySku(string sku)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.SKU == sku);

        if (product == null)
        {
            return NotFound(ApiResponse<Product>.Fail("Product not found"));
        }

        return Ok(ApiResponse<Product>.Ok(product));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<Product>>> CreateProduct(CreateProductDto dto)
    {
        if (await _context.Products.AnyAsync(p => p.SKU == dto.SKU))
        {
            return BadRequest(ApiResponse<Product>.Fail("SKU already exists"));
        }

        var product = new Product
        {
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            SKU = dto.SKU,
            StockQuantity = dto.StockQuantity,
            Category = dto.Category
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created product {ProductId} with SKU {SKU}", product.Id, product.SKU);

        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, ApiResponse<Product>.Ok(product, "Product created successfully"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<Product>>> UpdateProduct(int id, UpdateProductDto dto)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound(ApiResponse<Product>.Fail("Product not found"));
        }

        if (dto.Name != null) product.Name = dto.Name;
        if (dto.Description != null) product.Description = dto.Description;
        if (dto.Price.HasValue) product.Price = dto.Price.Value;
        if (dto.StockQuantity.HasValue) product.StockQuantity = dto.StockQuantity.Value;
        if (dto.Category != null) product.Category = dto.Category;
        if (dto.IsActive.HasValue) product.IsActive = dto.IsActive.Value;

        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated product {ProductId}", product.Id);

        return Ok(ApiResponse<Product>.Ok(product, "Product updated successfully"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound(ApiResponse<bool>.Fail("Product not found"));
        }

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted product {ProductId}", id);

        return Ok(ApiResponse<bool>.Ok(true, "Product deleted successfully"));
    }

    [HttpPatch("{id}/stock")]
    public async Task<ActionResult<ApiResponse<Product>>> UpdateStock(int id, [FromBody] int quantity)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            return NotFound(ApiResponse<Product>.Fail("Product not found"));
        }

        product.StockQuantity = quantity;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated stock for product {ProductId} to {Quantity}", product.Id, quantity);

        return Ok(ApiResponse<Product>.Ok(product, "Stock updated successfully"));
    }
}
