package finalproject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.text.SimpleDateFormat;
import java.util.Calendar;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.AbstractJavaRDDLike;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.rdd.RDD;
import org.apache.spark.api.java.JavaRDDLike;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.api.java.function.PairFunction;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.RowFactory;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.catalyst.expressions.GenericRowWithSchema;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructType;

import com.amazonaws.services.applicationdiscovery.model.ResourceNotFoundException;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughputExceededException;
import com.amazonaws.services.dynamodbv2.document.BatchWriteItemOutcome;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.document.UpdateItemOutcome;
import com.amazonaws.services.dynamodbv2.document.api.UpdateItemApi;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
import com.amazonaws.services.dynamodbv2.model.WriteRequest;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import com.google.gson.*;
import storage.DynamoConnector;
import storage.SparkConnector;
import scala.Tuple2;
import finalproject.TokenizeNews;

public class LoadNews {
    	/**
	 * The basic logger
	 */
	static Logger logger = LogManager.getLogger(LoadNews.class);
    /**
	 * Connection to DynamoDB
	 */
	DynamoDB db;
	Table news;
	
	/**
	 * Connection to Apache Spark
	 */
	SparkSession spark;
	JavaSparkContext context;
	TokenizeNews tokenizer;
	int count = 0;

    /**
	 * Initialize the database connection and open the file
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 * @throws DynamoDbException 
	 */
	public void initialize() throws IOException, DynamoDbException, InterruptedException {
		logger.info("Connecting to DynamoDB...");
		db = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");
		
		spark = SparkConnector.getSparkConnection();
		context = SparkConnector.getSparkContext();
		
		logger.debug("Connected!");
	}

	/**
	 * Returns an RDD of parsed talk data
	 * 
	 * @param filePath
	 * @return
	 * @throws IOException
	 */
	JavaRDD<Row> getNews(String filePath) throws IOException {
		BufferedReader reader = null;
		JsonParser mapper = new JsonParser();
		reader = new BufferedReader(new FileReader(new File(filePath)));

		String nextLine;
		List<JsonObject> lines = new ArrayList<>();

		while((nextLine = reader.readLine()) != null) {
			JsonObject news = mapper.parseString(nextLine).getAsJsonObject();
			lines.add(news);
		}

		final StructType schema = new StructType() // Make Schema for the TedTalks
						.add("category", "string")  
						.add("headline", "string") 
						.add("authors", "string")  
						.add("link", "string") 
						.add("short_description", "string") 
						.add("date", "string");

		List<Row> rowOfNews = lines.parallelStream()
						.map(line -> {
							Object[] row = new Object[6]; // assign appropriate values for each Schema
							String ct = line.get("category").toString();
							String hl = line.get("headline").toString();
							String au = line.get("authors").toString();
							String lk = line.get("link").toString();
							String sd = line.get("short_description").toString();
							String dt = line.get("date").toString();
							row[0] = ct.substring(1, ct.length() - 1);
							row[1] = hl.substring(1, hl.length() - 1);
							row[2] = au.substring(1, au.length() - 1);
							row[3] = lk.substring(1, lk.length() - 1);
							row[4] = sd.substring(1, sd.length() - 1);
							row[5] = dt.substring(1, dt.length() - 1);
							return new GenericRowWithSchema(row, schema);// Make Row with Schema
						})
						.collect(Collectors.toList());
		JavaRDD<Row> newsRDD = context.parallelize(rowOfNews);

		return newsRDD;
	}

	/**
	 * Main functionality in the program: read and process the social network
	 * 
	 * @throws IOException File read, network, and other errors
	 * @throws DynamoDbException DynamoDB is unhappy with something
	 * @throws InterruptedException User presses Ctrl-C
	 */
	public void run() throws IOException, DynamoDbException, InterruptedException {
		logger.info("Running");

		// Load + store the news data
		JavaRDD<Row> newsData = this.getNews("NewsCategoryData.txt");
		
		// upload to Dynamo_DB
	//	try {
			newsData.foreachPartition(iter -> { 
				String timeStamp = new SimpleDateFormat("yyyy-MM-dd").format(Calendar.getInstance().getTime());
				Thread.sleep(3);
				HashSet<Item> rows = new HashSet<Item>(); 
				HashSet<String> dupli = new HashSet<String>();
				
				String tableName = "newsData";
				while (iter.hasNext()) {
					Row news = iter.next();
					DynamoDB conn = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");
					// Create Item
					if (!dupli.contains((String) news.getAs(1))) {
						Thread.sleep(3);
						LocalDate ldate = LocalDate.parse((String) news.getAs(5)).plusYears(5);
						String dt = ldate.toString();
						System.out.println(dt);
						String title = (String) news.getAs(1);
						if (title.length() != 0 && dt.compareTo(timeStamp) == 0) {
							Item newsItem = new Item()
											.withPrimaryKey("headline", (String) news.getAs(1), "date", dt)
											.withString("category", (String) news.getAs(0))
											.withString("authors", (String) news.getAs(2))
											.withString("link", (String) news.getAs(3))
											.withString("short_description", (String) news.getAs(4));
							Thread.sleep((long) 0.5);
							rows.add(newsItem);
							dupli.add((String) news.getAs(1));
						} else {
							System.out.println(title);
						}
					}
					
					if (rows.size() == 25 || !iter.hasNext()) {
						Thread.sleep((long) 0.5);
						TableWriteItems writ = new TableWriteItems(tableName).withItemsToPut(rows);
						Thread.sleep(5);
						BatchWriteItemOutcome ret = conn.batchWriteItem(writ);
						Thread.sleep((long) 0.5);
						Map<String, List<WriteRequest>> leftover = ret.getUnprocessedItems();
						if (leftover != null && leftover.size() != 0) {
							Thread.sleep(3);
							conn.batchWriteItemUnprocessed(leftover);
							Thread.sleep((long) 0.5);	
						}
						rows = new HashSet<Item>();
					}	
				}
			});

		// for updating the count of news per category

		/*	
		} catch (Exception e) {
			System.out.println("error occurred");
		} 
		finally {
			//System.out.println(count + " lines read");
			JavaPairRDD<String, Integer> categoryNodeWeight = newsData
					.mapToPair(x -> new Tuple2<String, String>((String) x.getAs(0), (String) x.getAs(1)))
					.mapToPair(x -> new Tuple2<String, Integer>(x._1, 1)) // c->a adjacent node weight should sum up to 1
					.reduceByKey((x, y) -> x + y);
			
			JavaRDD<Tuple2<String, Integer>> rdd = JavaPairRDD.toRDD(categoryNodeWeight).toJavaRDD();
			rdd.foreachPartition(iter -> { 
				HashSet<Item> categories = new HashSet<Item>(); 
				DynamoDB conn = DynamoConnector.getConnection("https://dynamodb.us-east-1.amazonaws.com");
				String tableName = "newsCount";

				while (iter.hasNext()) {
					Tuple2<String, Integer> x = iter.next();
					System.out.println(x._1 + " , " + x._2);
					Item newsItem = new Item()
							.withPrimaryKey("category", x._1)
							.withInt("count", x._2);
					categories.add(newsItem);
						
					if (categories.size() == 25 || !iter.hasNext()) {
						Thread.sleep(3);
						TableWriteItems writ = new TableWriteItems(tableName).withItemsToPut(categories);
						BatchWriteItemOutcome ret = conn.batchWriteItem(writ);
						Map<String, List<WriteRequest>> leftover = ret.getUnprocessedItems();
						if (leftover != null && leftover.size() != 0) {
							conn.batchWriteItemUnprocessed(leftover);	
						}
						categories = new HashSet<Item>();
					}	
				}
					
			});



		}*/
	}
	
	public void shutdown() {
		logger.info("Shutting down");
		
		DynamoConnector.shutdown();
		
		if (spark != null)
			spark.close();
	}
	
	public static void main(String[] args) {
		final LoadNews ln = new LoadNews();

		try {
			ln.initialize();

			ln.run();
		} catch (final IOException ie) {
			logger.error("I/O error: ");
			ie.printStackTrace();
		} catch (final DynamoDbException e) {
			e.printStackTrace();
		} catch (final InterruptedException e) {
			e.printStackTrace();
		} finally {
			ln.shutdown();
		}
	}   
}

