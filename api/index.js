const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3001;
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = 'mydb';

// JSONボディパーサーを追加
app.use(express.json());

// ルートパスにウェルカムメッセージを追加
app.get('/', (req, res) => {
  res.json({ 
    message: 'Recipe Search API',
    endpoints: {
      search: 'GET /search?ingredients=ingredient1,ingredient2 or POST /search with JSON body',
      dbInfo: '/db-info - database structure information'
    },
    examples: {
      getSearch: [
        'http://localhost:3001/search?ingredients=鶏',
        'http://localhost:3001/search?ingredients=豆腐,玉ねぎ'
      ],
      postSearch: {
        method: 'POST',
        url: 'http://localhost:3001/search',
        headers: { 'Content-Type': 'application/json' },
        body: { ingredients: ['鶏', '豆腐', '玉ねぎ'] }
      }
    }
  });
});

// パラメータ形式の検索エンドポイント（GET /search）
app.get('/search', async (req, res) => {
  const { ingredients } = req.query;
  const ingredientsArray = ingredients ? ingredients.split(',') : [];

  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    const db = client.db(dbName);
    const recipes = db.collection('recipes');

    // 部分一致検索
    const searchConditions = ingredientsArray.map(ingredient => ({
      ingredients: { $elemMatch: { $regex: ingredient.trim(), $options: 'i' } }
    }));

    const results = await recipes.find({
      $and: searchConditions
    }).toArray();

    res.json({
      resultCount: results.length,
      results: results
    });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  } finally {
    await client.close();
  }
});

// JSON形式での検索エンドポイント（POST /search）
app.post('/search', async (req, res) => {
  const { ingredients, searchType = 'and' } = req.body;
  
  // ingredientsが配列でない場合の処理
  const ingredientsArray = Array.isArray(ingredients) ? ingredients : [];

  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    const db = client.db(dbName);
    const recipes = db.collection('recipes');

    // 部分一致検索
    const searchConditions = ingredientsArray.map(ingredient => ({
      ingredients: { $elemMatch: { $regex: ingredient.trim(), $options: 'i' } }
    }));

    let query = {};
    if (searchConditions.length > 0) {
      query = searchType === 'or' ? { $or: searchConditions } : { $and: searchConditions };
    }

    const results = await recipes.find(query).toArray();

    res.json({
      searchQuery: {
        ingredients: ingredientsArray,
        searchType: searchType,
        query: query
      },
      resultCount: results.length,
      results: results
    });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  } finally {
    await client.close();
  }
});

// データベースの構造を確認するエンドポイント
app.get('/db-info', async (req, res) => {
  const client = new MongoClient(mongoUrl);
  try {
    await client.connect();
    const db = client.db(dbName);
    const recipes = db.collection('recipes');

    // 全件数を確認
    const totalCount = await recipes.countDocuments();
    
    // 最初の1件を取得してデータ構造を確認
    const firstDoc = await recipes.findOne();
    
    // 各ドキュメントの構造を確認（最初の3件）
    const sampleDocs = await recipes.find({}).limit(3).toArray();
    
    // ingredients配列の長さの統計
    const ingredientStats = await recipes.aggregate([
      { $project: { ingredientCount: { $size: "$ingredients" } } },
      { $group: { 
        _id: null, 
        avgIngredients: { $avg: "$ingredientCount" },
        minIngredients: { $min: "$ingredientCount" },
        maxIngredients: { $max: "$ingredientCount" }
      }}
    ]).toArray();

    res.json({
      totalDocuments: totalCount,
      firstDocument: firstDoc,
      sampleDocuments: sampleDocs,
      ingredientStatistics: ingredientStats[0] || null,
      dataStructure: {
        hasIngredients: firstDoc ? Array.isArray(firstDoc.ingredients) : false,
        ingredientsIsArray: firstDoc ? Array.isArray(firstDoc.ingredients) : false,
        firstDocumentKeys: firstDoc ? Object.keys(firstDoc) : []
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  } finally {
    await client.close();
  }
});

app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
